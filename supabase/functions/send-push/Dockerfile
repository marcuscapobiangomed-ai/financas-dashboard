FROM denoland/deno:1.37.0

EXPOSE 9000

WORKDIR /home/deno

COPY . .

RUN deno cache index.ts

CMD ["run", "--allow-all", "--watch", "--no-check", "index.ts"]