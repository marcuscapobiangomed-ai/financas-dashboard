# send-push Edge Function

Envia push notifications para todos os usuários inscritos.

## Deploy

```bash
supabase functions deploy send-push
```

## Variáveis de Ambiente Necessárias

No Supabase Dashboard → Edge Functions → Settings:

- `VAPID_PUBLIC_KEY` - Chave pública VAPID
- `VAPID_PRIVATE_KEY` - Chave privada VAPID

## Como gerar as chaves VAPID

```bash
# Usando web-push
npx web-push generate-vapid-keys
```

## Uso

```typescript
const { error } = await supabase.functions.invoke('send-push', {
  body: { 
    title: 'Alerta de orçamento', 
    body: 'Você atingiu 80% do limite',
    tag: 'budget-alert'
  }
})
```

## Fluxo completo

1. Gerar chaves VAPID
2. Adicionar ao .env local (`VITE_VAPID_PUBLIC_KEY`)
3. Fazer deploy da edge function com as chaves
4. No app, chamar `savePushSubscription(userId)` para registrar
5. Para enviar, chamar `sendPushNotification(title, body, tag)`