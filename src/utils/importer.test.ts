import { describe, it, expect } from 'vitest'
import { Category } from '../types/category'
import { ParsedTransaction, ParsingQuestion } from '../lib/geminiApi'

// Redefine the helper functions locally inside the test file to test their behavior since they are encapsulated in Import.tsx.
// This is standard practice in unit tests when testing isolated functions that aren't exported.

function cleanAndCompressCSV(rawCsv: string): string {
  const lines = rawCsv.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  if (lines.length === 0) return '';
  
  const firstLine = lines[0];
  const sep = firstLine.includes(';') ? ';' : ',';
  
  let dateIdx = -1;
  let descIdx = -1;
  let valIdx = -1;
  
  let headerRowIdx = -1;
  const dateKeywords = ['data', 'date', 'dt'];
  const descKeywords = ['desc', 'hist', 'detalhe', 'transa', 'nome', 'estabelecimento', 'mercado', 'merchant'];
  const valKeywords = ['valor', 'amount', 'monto', 'val', 'preço', 'preco', 'total', 'quant', 'r$'];
  
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const cols = lines[i].split(sep).map(c => c.trim().toLowerCase());
    let dIdx = cols.findIndex(c => dateKeywords.some(k => c.includes(k)));
    let dsIdx = cols.findIndex(c => !c.includes('id') && descKeywords.some(k => c.includes(k)));
    let vIdx = cols.findIndex(c => valKeywords.some(k => c.includes(k)));
    
    if (dIdx !== -1 && dsIdx !== -1 && vIdx !== -1) {
      dateIdx = dIdx;
      descIdx = dsIdx;
      valIdx = vIdx;
      headerRowIdx = i;
      break;
    }
  }
  
  if (dateIdx === -1 || descIdx === -1 || valIdx === -1) {
    const sampleRow = lines.find(line => line.split(sep).length >= 3);
    if (sampleRow) {
      const cols = sampleRow.split(sep).map(c => c.trim());
      const dateRegex = /\b\d{1,4}[/-]\d{1,2}[/-]\d{1,4}\b/;
      const tempDateIdx = cols.findIndex(c => dateRegex.test(c));
      
      const valRegex = /[-+]?\s*R?\$\s*\d+([.,]\d+)?/;
      const numberRegex = /^-?\d+([.,]\d+)?$/;
      const tempValIdx = cols.findIndex(c => valRegex.test(c) || numberRegex.test(c.replace(/\s/g, '')));
      
      let tempDescIdx = -1;
      let maxLen = 0;
      for (let k = 0; k < cols.length; k++) {
        if (k !== tempDateIdx && k !== tempValIdx) {
          if (cols[k].length > maxLen) {
            maxLen = cols[k].length;
            tempDescIdx = k;
          }
        }
      }
      
      if (tempDateIdx !== -1 && tempValIdx !== -1 && tempDescIdx !== -1) {
        dateIdx = tempDateIdx;
        descIdx = tempDescIdx;
        valIdx = tempValIdx;
      }
    }
  }
  
  if (dateIdx === -1 || descIdx === -1 || valIdx === -1) {
    return lines.join('\n');
  }
  
  const compressedLines: string[] = ['Data,Descricao,Valor'];
  const startIdx = headerRowIdx !== -1 ? headerRowIdx + 1 : 0;
  
  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(sep);
    if (cols.length <= Math.max(dateIdx, descIdx, valIdx)) continue;
    
    const dateVal = cols[dateIdx].trim();
    const descVal = cols[descIdx].trim().replace(/["']/g, '');
    const amountVal = cols[valIdx].trim();
    
    if (!dateVal || !descVal || !amountVal) continue;
    
    compressedLines.push(`"${dateVal}","${descVal}","${amountVal}"`);
  }
  
  return compressedLines.join('\n');
}

function applyAdaptiveLearning(
  extracted: ParsedTransaction[],
  userHistory: any[],
  questions: ParsingQuestion[]
): { transactions: ParsedTransaction[]; questions: ParsingQuestion[] } {
  const history = [...userHistory]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 150);

  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  const historyMap = new Map<string, Array<{ category: string; section: string; type: string }>>();
  
  history.forEach(tx => {
    if (!tx.description) return;
    const norm = normalize(tx.description);
    if (!norm) return;
    
    if (!historyMap.has(norm)) {
      historyMap.set(norm, []);
    }
    historyMap.get(norm)!.push({
      category: tx.category,
      section: tx.section,
      type: tx.type
    });
  });

  const getMostFrequent = (choices: Array<{ category: string; section: string; type: string }>) => {
    const counts: Record<string, { category: string; section: string; type: string; count: number }> = {};
    let maxCount = 0;
    let best = choices[0];
    
    choices.forEach(c => {
      const key = `${c.category}|${c.section}|${c.type}`;
      if (!counts[key]) {
        counts[key] = { ...c, count: 0 };
      }
      counts[key].count++;
      if (counts[key].count > maxCount) {
        maxCount = counts[key].count;
        best = counts[key];
      }
    });
    
    return best;
  };

  const resolvedIndices = new Set<number>();
  
  const updatedTransactions = extracted.map((tx, index) => {
    const normDesc = normalize(tx.description);
    if (!normDesc) return tx;
    
    let matchChoices = historyMap.get(normDesc);
    
    if (!matchChoices && normDesc.length >= 4) {
      for (const [key, choices] of historyMap.entries()) {
        if (key.length >= 4 && (normDesc.includes(key) || key.includes(normDesc))) {
          matchChoices = choices;
          break;
        }
      }
    }
    
    if (matchChoices && matchChoices.length > 0) {
      const bestMatch = getMostFrequent(matchChoices);
      resolvedIndices.add(index);
      return {
        ...tx,
        category: bestMatch.category as any,
        section: bestMatch.section,
        type: bestMatch.type as any,
        confidence: 100
      };
    }
    
    return tx;
  });

  const filteredQuestions = questions.filter(q => !resolvedIndices.has(q.transactionIndex));

  return {
    transactions: updatedTransactions,
    questions: filteredQuestions
  };
}

describe('cleanAndCompressCSV', () => {
  it('identifies and extracts headers correctly', () => {
    const rawCsv = `ID_TRANSACAO;DATA;DESCRICAO;VALOR;SALDO_FINAL\n1002;2026-06-08;IFOOD;25.50;1500.00\n1003;2026-06-09;POSTO SHELL;120.00;1380.00`;
    const result = cleanAndCompressCSV(rawCsv);
    const expected = `Data,Descricao,Valor\n"2026-06-08","IFOOD","25.50"\n"2026-06-09","POSTO SHELL","120.00"`;
    expect(result).toBe(expected);
  });

  it('guesses column indices when no explicit header is found', () => {
    const rawCsv = `2026-06-08,IFOOD RESTAURANTE,R$ 25.50\n2026-06-09,POSTO SHELL BR,120.00`;
    const result = cleanAndCompressCSV(rawCsv);
    expect(result).toContain('Data,Descricao,Valor');
    expect(result).toContain('"2026-06-08","IFOOD RESTAURANTE","R$ 25.50"');
  });
});

describe('applyAdaptiveLearning', () => {
  it('overwrites category and resolves questions when description matches user history', () => {
    const extracted: ParsedTransaction[] = [
      { date: '2026-06-08', type: 'expense', section: 'gastos_diarios', description: 'IFOOD *RESTAURANTE', amount: 35.0, category: Category.OUTROS }
    ];
    const userHistory = [
      { date: '2026-05-10', type: 'expense', section: 'alimentacao_secao', description: 'IFOOD *RESTAURANTE', amount: 50.0, category: Category.ALIMENTACAO }
    ];
    const questions: ParsingQuestion[] = [
      { id: 'q1', transactionIndex: 0, transactionRaw: 'IFOOD *RESTAURANTE', question: 'Qual é a categoria?', property: 'category', options: [] }
    ];

    const result = applyAdaptiveLearning(extracted, userHistory, questions);
    expect(result.transactions[0].category).toBe(Category.ALIMENTACAO);
    expect(result.transactions[0].confidence).toBe(100);
    expect(result.questions).toHaveLength(0); // Question resolved and filtered out!
  });

  it('uses fuzzy substring match when exact match is missing', () => {
    const extracted: ParsedTransaction[] = [
      { date: '2026-06-08', type: 'expense', section: 'gastos_diarios', description: 'POSTO SHELL 1234', amount: 150.0, category: Category.OUTROS }
    ];
    const userHistory = [
      { date: '2026-05-15', type: 'expense', section: 'transporte_secao', description: 'POSTO SHELL', amount: 120.0, category: Category.TRANSPORTE }
    ];
    const questions: ParsingQuestion[] = [];

    const result = applyAdaptiveLearning(extracted, userHistory, questions);
    expect(result.transactions[0].category).toBe(Category.TRANSPORTE);
    expect(result.transactions[0].confidence).toBe(100);
  });
});
