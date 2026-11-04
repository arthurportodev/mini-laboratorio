
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { Pool } = require("pg");
const { randomBytes, scrypt } = require("node:crypto");
const { promisify } = require("node:util");

// ========================================
// 1. CONEXÃO COM O BANCO DE DADOS
// ========================================

const banco = new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE
});

// ========================================
// 2. FUNÇÃO PARA PROTEGER A SENHA
// ========================================

const scryptAsync = promisify(scrypt);

async function protegerSenha(senha) {
    const salt = randomBytes(16).toString("hex");

    const hash = await scryptAsync(senha, salt, 64);

    return salt + ":" + hash.toString("hex");
}

// ========================================
// 3. FUNÇÃO PARA ENVIAR RESPOSTAS JSON
// ========================================

function responderJSON(res, status, dados) {
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(dados));
}

// ========================================
// 4. CRIAÇÃO DO SERVIDOR HTTP
// ========================================

const servidor = http.createServer(async (req, res) => {

    try {

        // ------------------------------------
        // ROTA GET / - ENTREGAR O HTML
        // ------------------------------------

        if (req.method === "GET" && req.url === "/") {

            const html = await fs.readFile(
                path.join(__dirname, "index.html")
            );

            res.writeHead(200, {
                "Content-Type": "text/html; charset=utf-8"
            });

            res.end(html);
            return;
        }

        // ------------------------------------
        // ROTA GET /script.js
        // ------------------------------------

        if (req.method === "GET" && req.url === "/script.js") {

            const script = await fs.readFile(
                path.join(__dirname, "script.js")
            );

            res.writeHead(200, {
                "Content-Type": "text/javascript; charset=utf-8"
            });

            res.end(script);
            return;
        }

        // ------------------------------------
        // ROTA POST /api/cadastros
        // ------------------------------------

        if (
            req.method === "POST" &&
            req.url === "/api/cadastros"
        ) {

            // 5. Verificar o tipo de conteúdo

            const tipo = req.headers["content-type"] || "";

            if (!tipo.startsWith("application/json")) {
                responderJSON(res, 415, {
                    erro: "Envie os dados em JSON."
                });
                return;
            }

            // 6. Receber o corpo da requisição

            const partes = [];
            let tamanho = 0;

            for await (const parte of req) {
                tamanho += parte.length;

                if (tamanho > 8192) {
                    responderJSON(res, 413, {
                        erro: "Dados muito grandes."
                    });
                    return;
                }

                partes.push(parte);
            }

            const corpo = Buffer.concat(partes).toString("utf8");

            // 7. Converter JSON em objeto JavaScript

            let dados;

            try {
                dados = JSON.parse(corpo);
            } catch {
                responderJSON(res, 400, {
                    erro: "JSON invalido."
                });
                return;
            }

            // 8. Validar os dados recebidos

            if (
                !dados ||
                typeof dados.nome !== "string" ||
                typeof dados.email !== "string" ||
                typeof dados.senha !== "string"
            ) {
                responderJSON(res, 422, {
                    erro: "Dados invalidos."
                });
                return;
            }

            // 9. Normalizar os dados

            const nome = dados.nome.trim();
            const email = dados.email.trim().toLowerCase();
            const senha = dados.senha;

            if (
                nome.length === 0 ||
                !email.includes("@") ||
                senha.length < 8
            ) {
                responderJSON(res, 422, {
                    erro: "Verifique nome, email e senha."
                });
                return;
            }

            // 10. Criar o hash da senha

            const senhaHash = await protegerSenha(senha);

            // 11. Preparar o comando SQL

            const sql = `
                INSERT INTO cadastros
                    (nome, email, senha_hash)
                VALUES
                    ($1, $2, $3)
                RETURNING id, nome, email, criado_em
            `;

            // 12. Preparar os valores

            const valores = [nome, email, senhaHash];

            // 13. Gravar no PostgreSQL

            const resultado = await banco.query(sql, valores);

            // 14. Retornar confirmação ao navegador

            responderJSON(res, 201, {
                mensagem: "Cadastro salvo com sucesso!",
                cadastro: resultado.rows[0]
            });

            return;
        }

        // ------------------------------------
        // ROTA NÃO ENCONTRADA
        // ------------------------------------

        responderJSON(res, 404, {
            erro: "Rota nao encontrada."
        });

    } catch (erro) {

        // Tratar email já cadastrado

        if (erro.code === "23505") {
            responderJSON(res, 409, {
                erro: "Este email ja foi cadastrado."
            });
            return;
        }

        console.error("Erro no servidor:", erro.message);

        if (!res.headersSent) {
            responderJSON(res, 500, {
                erro: "Erro interno do servidor."
            });
        } else if (!res.writableEnded) {
            res.end();
        }
    }
});

// ========================================
// 15. INICIAR O SERVIDOR
// ========================================

async function iniciarServidor() {

    // Testar a conexão com o PostgreSQL
    await banco.query("SELECT 1");

    // Iniciar o servidor HTTP
    servidor.listen(3000, "127.0.0.1", () => {
        console.log("Banco conectado com sucesso!");
        console.log("Servidor rodando em http://localhost:3000");
    });
}

iniciarServidor().catch((erro) => {
    console.error("Falha ao iniciar:", erro.message);
    process.exit(1);
});
