/* =========================================================
   ACESSO DA EQUIPE DE TI
   Chaves de armazenamento (mantidas do sistema original):
   - 'ti_usuarios'  → contas criadas pelo cadastro
   - 'demanda_user' → sessão ativa lida pelo index.html
========================================================= */

const DOMINIO_INSTITUCIONAL = '@faculdadececape.edu.br';

// ================= CONTAS PRÉ-CADASTRADAS =================
const usuariosPadrao = [
    { nome: "Equipe", sobrenome: "TI", email: "ti@faculdadececape.edu.br", senha: "123" },
    { nome: "Diretoria", sobrenome: "Cecape", email: "diretoria@faculdadececape.edu.br", senha: "admin" },
    { nome: "Wilson", sobrenome: "Batista", email: "wilson.batista@faculdadececape.edu.br", senha: "Wilsoncecape@2023" }
];
// ==========================================================

/* ---------------- Interface ---------------- */

function alternarVistaAcesso(vista) {
    document.querySelectorAll('.vista-acesso').forEach(el => el.classList.remove('ativo'));
    document.getElementById(`vista-${vista}`).classList.add('ativo');
    limparValidacao();
    document.querySelectorAll('.caixa-mensagem').forEach(el => el.className = 'caixa-mensagem');
}

function mostrarMensagem(idElemento, texto, tipo) {
    const caixa = document.getElementById(idElemento);
    if (!caixa) return;
    caixa.textContent = texto;
    caixa.className = `caixa-mensagem caixa-mensagem--${tipo}`;
}

function limparValidacao() {
    document.querySelectorAll('.campo-invalido').forEach(el => el.classList.remove('campo-invalido'));
}

function marcarInvalido(input) {
    const grupo = input.closest('.grupo-campo') || input;
    grupo.classList.add('campo-invalido');
    // reinicia a animação caso o campo já estivesse marcado
    void grupo.offsetWidth;
}

function alternarVisibilidadeSenha(idInput, botao) {
    const input = document.getElementById(idInput);
    if (!input) return;
    const visivel = input.type === 'text';
    input.type = visivel ? 'password' : 'text';
    botao.classList.toggle('senha-visivel', !visivel);
    botao.setAttribute('aria-label', visivel ? 'Mostrar senha' : 'Ocultar senha');
}

function obterTodasContas() {
    const salvos = JSON.parse(localStorage.getItem('ti_usuarios')) || [];
    return [...usuariosPadrao, ...salvos];
}

/* ---------------- Cadastro ---------------- */

const formularioCadastro = document.getElementById('formularioCadastro');
if (formularioCadastro) {
    formularioCadastro.addEventListener('submit', function (e) {
        e.preventDefault();
        limparValidacao();

        const nome = document.getElementById('cadastroNome');
        const sobrenome = document.getElementById('cadastroSobrenome');
        const email = document.getElementById('cadastroEmail');
        const senha = document.getElementById('cadastroSenha');
        const repetirSenha = document.getElementById('cadastroRepetirSenha');

        let temErro = false;
        [nome, sobrenome, email, senha, repetirSenha].forEach(campo => {
            if (!campo.value.trim()) { marcarInvalido(campo); temErro = true; }
        });

        if (temErro) return mostrarMensagem('mensagemCadastro', 'Preencha todos os campos destacados.', 'erro');

        if (senha.value !== repetirSenha.value) {
            marcarInvalido(senha);
            marcarInvalido(repetirSenha);
            return mostrarMensagem('mensagemCadastro', 'As senhas não coincidem.', 'erro');
        }

        const emailValor = email.value.trim().toLowerCase();
        if (!emailValor.endsWith(DOMINIO_INSTITUCIONAL)) {
            marcarInvalido(email);
            return mostrarMensagem('mensagemCadastro', `O cadastro é restrito a e-mails ${DOMINIO_INSTITUCIONAL}`, 'erro');
        }

        if (obterTodasContas().some(u => u.email.toLowerCase() === emailValor)) {
            marcarInvalido(email);
            return mostrarMensagem('mensagemCadastro', 'Este e-mail já está cadastrado na TI.', 'erro');
        }

        const contasSalvas = JSON.parse(localStorage.getItem('ti_usuarios')) || [];
        contasSalvas.push({
            nome: nome.value.trim(),
            sobrenome: sobrenome.value.trim(),
            email: emailValor,
            senha: senha.value
        });
        localStorage.setItem('ti_usuarios', JSON.stringify(contasSalvas));

        mostrarMensagem('mensagemCadastro', 'Cadastro concluído! Redirecionando para o login…', 'sucesso');
        setTimeout(() => {
            formularioCadastro.reset();
            alternarVistaAcesso('login');
        }, 1600);
    });
}

/* ---------------- Login ---------------- */

const formularioLogin = document.getElementById('formularioLogin');
if (formularioLogin) {
    formularioLogin.addEventListener('submit', function (e) {
        e.preventDefault();
        limparValidacao();

        const email = document.getElementById('loginEmail');
        const senha = document.getElementById('loginSenha');

        let temErro = false;
        [email, senha].forEach(campo => {
            if (!campo.value.trim()) { marcarInvalido(campo); temErro = true; }
        });
        if (temErro) return mostrarMensagem('mensagemLogin', 'Preencha e-mail e senha.', 'erro');

        const emailValor = email.value.trim().toLowerCase();
        if (!emailValor.endsWith(DOMINIO_INSTITUCIONAL)) {
            marcarInvalido(email);
            return mostrarMensagem('mensagemLogin', `Acesso restrito a e-mails ${DOMINIO_INSTITUCIONAL}`, 'erro');
        }

        const conta = obterTodasContas().find(u => u.email.toLowerCase() === emailValor && u.senha === senha.value);

        if (!conta) {
            marcarInvalido(senha);
            return mostrarMensagem('mensagemLogin', 'E-mail ou senha incorretos. Se ainda não tem acesso, cadastre-se.', 'erro');
        }

        localStorage.setItem('demanda_user', conta.nome);
        mostrarMensagem('mensagemLogin', 'Acesso liberado. Abrindo o quadro…', 'sucesso');
        setTimeout(() => { window.location.href = 'index.html'; }, 600);
    });
}

/* ---------------- Inicialização ---------------- */

alternarVistaAcesso('login');
