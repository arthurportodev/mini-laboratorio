const { Pool } = require("pg");

const banco = new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE
});

async function testarConexao() {
    try {
        const resultado = await banco.query(
            "SELECT Current_database() AS nome"
        );

        console.log("Conectado ao banco:", resultado.rows[0].nome);

    } catch (erro) {
        console.error("Erro de conexão:", erro.message);

    } finally {
        await banco.end();
    }
}

testarConexao();