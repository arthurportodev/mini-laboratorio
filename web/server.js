const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const servidor = http.createServer(async (req, res) => {
    try {
        if (req.method === "GET" && req.url === "/") {
            const html = await fs.readFile(
                path.join(__dirname, "index.html")
            );

            res.writeHead(200, {
                "content-Type": "text/html; charset=utf-8"
            });

            res.end(html);
            return;
        }

        if (req.method === "GET" && req.url === "/script.js") {
            const script = await fs.readFile(path.join(__dirname, "script.js"));
            
            res.writeHead(200, {
                "content-Type": "text/javascript; charset=utf-8"
            });

            res.end(script);
            return;
        }

        if (req.method === "POST" && req.url === "/api/cadastros") {
            let corpo = "";

            for await (const parte of req) {
                corpo += parte;
            }

            let dados;

            try {
                dados = JSON.parse(corpo);
            } catch {
                res.writeHead(400);
                res.end("JSON invalido");
                return;
            }

            if (
                !dados ||
                typeof dados.nome !== "string" ||
                dados.nome.trim() === "" ||
                typeof dados.email !== "string" ||
                !dados.email.includes("@") ||
                typeof dados.senha !== "string" ||
                dados.senha.length < 8
            ) {
                res.writeHead(422);
                res.end("Dados invalidos");
                return;

            }

            console.log("Nome:", dados.nome);
            console.log("Email:", dados.email);
            
            res.writeHead(201, {
                "content-type": "aplication/json"
            });

            res.end(JSON.stringify({
                mensagem: "Cadastro recebido com sucesso!"
            }));

            return;
        }

        res.writeHead(404);
        res.end("Rota nao encontrada");
    } catch (erro) {
        console.erro("Erro no servidor:", erro);

        res.writeHead(500);
        res.end("Erro interno do servidor");
    }
});

servidor.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
});