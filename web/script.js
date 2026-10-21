const formulario = document.querySelector("form");

function normalizarNome(nome) {
    return nome.trim();
}

function normalizarEmail(email) {
    return email.trim().toLowerCase();

}

formulario.addeventListener("submit", async function (evento) {
    evento.preventDefault();

    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    const dados = {
        nome: normalizarNome(nome),
        email: normalizarEmail(email),
        senha: senha
    };

    if (dados.senha.length < 8) {
        alert("A senha precisa ter pelo menos 8 caracteres.");
        return;
    }

    try {
        const resposta = await fetch("/api/cadastros", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dados)
        });

        if (!resposta.ok) {
            throw new Error("Não foi possível realizar o cadastro.");
        }

        alert("Cadastro realizado com sucesso!");
        formulario.reset();
    } catch (erro) {
        alert("Erro ao enviar os dados para a API.");
        console.log(erro.message);
    }
});