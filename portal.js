/* =========================================================
   PORTAL DO SOLICITANTE
   Chaves de armazenamento (mantidas do sistema original):
   - 'portal_usuarios'       → contas dos solicitantes
   - 'portal_usuarioLogado'  → sessão ativa do portal
   - 'kanban_cards'          → mesma base usada pelo quadro da TI
========================================================= */

const DOMINIO_INSTITUCIONAL = '@faculdadececape.edu.br';

let idSolicitacaoEmEdicao = null;
let filtroAtivo = 'todas';

/* ---------------- Interface de acesso ---------------- */

function alternarVistaAcesso(vista) {
    document.querySelectorAll('.vista-acesso').forEach(el => el.classList.remove('ativo'));
    document.getElementById(`vista-${vista}`).classList.add('ativo');
    document.querySelectorAll('.campo-invalido').forEach(el => el.classList.remove('campo-invalido'));
    document.querySelectorAll('.caixa-mensagem').forEach(el => el.className = 'caixa-mensagem');
}

function mostrarMensagem(idElemento, texto, tipo) {
    const caixa = document.getElementById(idElemento);
    if (!caixa) return;
    caixa.textContent = texto;
    caixa.className = `caixa-mensagem caixa-mensagem--${tipo}`;
}

function marcarInvalido(input) {
    (input.closest('.grupo-campo') || input).classList.add('campo-invalido');
}

function limparValidacao() {
    document.querySelectorAll('.campo-invalido').forEach(el => el.classList.remove('campo-invalido'));
}

function alternarVisibilidadeSenha(idInput, botao) {
    const input = document.getElementById(idInput);
    if (!input) return;
    const visivel = input.type === 'text';
    input.type = visivel ? 'password' : 'text';
    botao.classList.toggle('senha-visivel', !visivel);
    botao.setAttribute('aria-label', visivel ? 'Mostrar senha' : 'Ocultar senha');
}

/* ---------------- Utilidades ---------------- */

function obterUsuarios() { return JSON.parse(localStorage.getItem('portal_usuarios')) || []; }
function obterSolicitacoes() { return JSON.parse(localStorage.getItem('kanban_cards')) || []; }
function salvarSolicitacoes(lista) { localStorage.setItem('kanban_cards', JSON.stringify(lista)); }
function obterUsuarioLogado() { return JSON.parse(localStorage.getItem('portal_usuarioLogado')); }

function formatarData(dataString) {
    if (!dataString) return '—';
    const partes = dataString.split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : dataString;
}

function obterIniciais(nome) {
    if (!nome) return '?';
    const partes = nome.trim().split(/\s+/);
    return partes.length === 1 ? partes[0].slice(0, 2).toUpperCase() : (partes[0][0] + partes[1][0]).toUpperCase();
}

function obterCorAvatar(nome) {
    let hash = 0;
    for (let i = 0; i < (nome || '').length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash) % 360}, 62%, 52%)`;
}

function escaparHtml(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------------- Cadastro do solicitante ---------------- */

document.getElementById('formularioCadastroSolicitante').addEventListener('submit', function (e) {
    e.preventDefault();
    limparValidacao();

    const nome = document.getElementById('cadastroNome');
    const sobrenome = document.getElementById('cadastroSobrenome');
    const setor = document.getElementById('cadastroSetor');
    const email = document.getElementById('cadastroEmail');
    const senha = document.getElementById('cadastroSenha');

    let temErro = false;
    [nome, sobrenome, setor, email, senha].forEach(campo => {
        if (!campo.value.trim()) { marcarInvalido(campo); temErro = true; }
    });
    if (temErro) return mostrarMensagem('mensagemCadastro', 'Preencha todos os campos destacados.', 'erro');

    const emailValor = email.value.trim().toLowerCase();
    if (!emailValor.endsWith(DOMINIO_INSTITUCIONAL)) {
        marcarInvalido(email);
        return mostrarMensagem('mensagemCadastro', `O e-mail deve terminar com ${DOMINIO_INSTITUCIONAL}`, 'erro');
    }

    const usuarios = obterUsuarios();

    if (usuarios.some(u => u.email.toLowerCase() === emailValor)) {
        marcarInvalido(email);
        return mostrarMensagem('mensagemCadastro', 'Este e-mail já está cadastrado.', 'erro');
    }
    if (usuarios.some(u => u.nome.toLowerCase() === nome.value.trim().toLowerCase())) {
        marcarInvalido(nome);
        return mostrarMensagem('mensagemCadastro', 'Este nome de usuário já está em uso. Escolha outro.', 'erro');
    }

    usuarios.push({
        nome: nome.value.trim(),
        sobrenome: sobrenome.value.trim(),
        setor: setor.value.trim(),
        email: emailValor,
        senha: senha.value
    });
    localStorage.setItem('portal_usuarios', JSON.stringify(usuarios));

    mostrarMensagem('mensagemCadastro', 'Conta criada! Redirecionando para o login…', 'sucesso');
    setTimeout(() => {
        this.reset();
        alternarVistaAcesso('login');
    }, 1600);
});

/* ---------------- Login do solicitante ---------------- */

document.getElementById('formularioLoginSolicitante').addEventListener('submit', function (e) {
    e.preventDefault();
    limparValidacao();

    const identificador = document.getElementById('loginEmail');
    const senha = document.getElementById('loginSenha');

    let temErro = false;
    [identificador, senha].forEach(campo => {
        if (!campo.value.trim()) { marcarInvalido(campo); temErro = true; }
    });
    if (temErro) return mostrarMensagem('mensagemLogin', 'Preencha usuário e senha.', 'erro');

    const valor = identificador.value.trim().toLowerCase();
    const usuario = obterUsuarios().find(u =>
        (u.email.toLowerCase() === valor || u.nome.toLowerCase() === valor) && u.senha === senha.value
    );

    if (!usuario) {
        marcarInvalido(senha);
        return mostrarMensagem('mensagemLogin', 'Usuário ou senha incorretos.', 'erro');
    }

    localStorage.setItem('portal_usuarioLogado', JSON.stringify(usuario));
    iniciarPortal();
});

/* ---------------- Recuperação de senha (simulada) ---------------- */

function recuperarSenha() {
    const emailDigitado = prompt('RECUPERAÇÃO DE SENHA\n\nDigite seu e-mail institucional cadastrado:');
    if (!emailDigitado) return;

    const usuarios = obterUsuarios();
    const indice = usuarios.findIndex(u => u.email.toLowerCase() === emailDigitado.trim().toLowerCase());

    if (indice === -1) return alert('E-mail não encontrado no sistema.');

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    alert(`[SIMULAÇÃO DE E-MAIL]\n\nPara: ${emailDigitado}\nAssunto: Código de recuperação — Chamados TI Cecape\n\nSeu código é: ${codigo}`);

    const codigoDigitado = prompt(`Digite o código de 6 dígitos enviado para ${emailDigitado}:`);
    if (codigoDigitado !== codigo) return alert('Código inválido. Tente novamente.');

    const novaSenha = prompt('Código validado. Digite sua nova senha:');
    if (!novaSenha || !novaSenha.trim()) return alert('Senha inválida. Processo cancelado.');

    usuarios[indice].senha = novaSenha;
    localStorage.setItem('portal_usuarios', JSON.stringify(usuarios));
    alert('Senha alterada com sucesso. Você já pode entrar.');
}

/* ---------------- Sessão ---------------- */

function iniciarPortal() {
    const usuario = obterUsuarioLogado();
    if (!usuario) return;

    document.getElementById('area-acesso').style.display = 'none';
    document.getElementById('area-painel').style.display = 'block';
    document.getElementById('nomeSolicitante').textContent = usuario.nome;

    const avatar = document.getElementById('avatarSolicitante');
    avatar.textContent = obterIniciais(`${usuario.nome} ${usuario.sobrenome || ''}`);
    avatar.style.background = `linear-gradient(135deg, ${obterCorAvatar(usuario.nome)}, var(--cor-info-forte))`;

    carregarSolicitacoes();
}

function sairDoPortal() {
    localStorage.removeItem('portal_usuarioLogado');
    document.getElementById('area-painel').style.display = 'none';
    document.getElementById('area-acesso').style.display = 'grid';
    document.getElementById('formularioLoginSolicitante').reset();
    alternarVistaAcesso('login');
}

/* ---------------- Modal de solicitação ---------------- */

function abrirModalSolicitacao() {
    idSolicitacaoEmEdicao = null;
    document.getElementById('formularioSolicitacao').reset();
    document.getElementById('tituloModalSolicitacao').textContent = 'Solicitar equipamento ou serviço';
    document.getElementById('botaoEnviarSolicitacao').textContent = 'Enviar solicitação';
    document.getElementById('modalSolicitacao').classList.add('aberto');
}

function fecharModalSolicitacao() {
    document.getElementById('modalSolicitacao').classList.remove('aberto');
    idSolicitacaoEmEdicao = null;
}

/* ---------------- Salvar (criar ou editar) ---------------- */

document.getElementById('formularioSolicitacao').addEventListener('submit', function (e) {
    e.preventDefault();

    const usuario = obterUsuarioLogado();
    if (!usuario) return;

    const solicitacoes = obterSolicitacoes();

    const equipamento = document.getElementById('campoEquipamento').value.trim();
    const sala = document.getElementById('campoSala').value;
    const data = document.getElementById('campoData').value;
    const horaInicio = document.getElementById('campoHoraInicio').value;
    const horaFim = document.getElementById('campoHoraFim').value;
    const observacoes = document.getElementById('campoObservacoes').value.trim();

    if (!equipamento || !sala || !data || !horaInicio || !horaFim) {
        return alert('Preencha o equipamento, o local, a data e os horários.');
    }

    // Formato de texto mantido para continuar legível no quadro da TI
    const tituloFormatado = `Solicitação: ${equipamento}`;
    const descricaoFormatada = `Local: ${sala} | Horário: ${horaInicio} às ${horaFim}\nObs: ${observacoes}`;

    if (idSolicitacaoEmEdicao !== null) {
        const indice = solicitacoes.findIndex(s => s.id == idSolicitacaoEmEdicao);
        if (indice !== -1) {
            solicitacoes[indice].title = tituloFormatado;
            solicitacoes[indice].description = descricaoFormatada;
            solicitacoes[indice].dataUso = data;
        }
        alert('Solicitação atualizada com sucesso.');
    } else {
        solicitacoes.push({
            id: Date.now().toString(),
            title: tituloFormatado,
            description: descricaoFormatada,
            priority: 'media',
            status: 'pendente',
            assignee: 'Não atribuído',
            createdBy: `${usuario.nome} ${usuario.sobrenome} (${usuario.setor})`,
            createdAt: new Date().toISOString(),
            completedBy: null,
            completedAt: null,
            deletedFromBoard: false,
            emailSolicitante: usuario.email,
            dataUso: data
        });
        alert('Solicitação enviada para a equipe de TI.');
    }

    salvarSolicitacoes(solicitacoes);
    fecharModalSolicitacao();
    this.reset();
    carregarSolicitacoes();
});

/* ---------------- Editar e excluir ---------------- */

function podeAlterar(solicitacao) {
    return solicitacao.status === 'pendente' || solicitacao.status === 'em_andamento';
}

function editarSolicitacao(id) {
    const solicitacao = obterSolicitacoes().find(s => s.id == id);
    if (!solicitacao) return;

    if (!podeAlterar(solicitacao)) {
        return alert('Só é possível editar solicitações em aberto. Crie uma nova solicitação, se precisar.');
    }

    const dados = extrairDados(solicitacao);
    document.getElementById('campoEquipamento').value = dados.equipamento;
    document.getElementById('campoSala').value = dados.sala;
    document.getElementById('campoData').value = solicitacao.dataUso || '';
    document.getElementById('campoHoraInicio').value = dados.horaInicio;
    document.getElementById('campoHoraFim').value = dados.horaFim;
    document.getElementById('campoObservacoes').value = dados.observacoes;

    idSolicitacaoEmEdicao = id;
    document.getElementById('tituloModalSolicitacao').textContent = 'Editar solicitação';
    document.getElementById('botaoEnviarSolicitacao').textContent = 'Salvar alterações';
    document.getElementById('modalSolicitacao').classList.add('aberto');
}

function excluirSolicitacao(id) {
    let solicitacoes = obterSolicitacoes();
    const solicitacao = solicitacoes.find(s => s.id == id);

    if (solicitacao && !podeAlterar(solicitacao)) {
        return alert('Não é possível excluir solicitações já finalizadas ou canceladas.');
    }
    if (!confirm('Tem certeza que deseja cancelar e excluir esta solicitação?')) return;

    salvarSolicitacoes(solicitacoes.filter(s => s.id != id));
    carregarSolicitacoes();
}

/* Lê os campos a partir do texto padronizado gravado na demanda */
function extrairDados(solicitacao) {
    const resultado = { equipamento: '', sala: '', horaInicio: '', horaFim: '', observacoes: '' };
    try {
        resultado.equipamento = (solicitacao.title || '').replace('Solicitação: ', '');

        const linhas = (solicitacao.description || '').split('\n');
        const partes = linhas[0].split('|');

        resultado.sala = (partes[0] || '').replace('Local: ', '').trim();

        const horas = (partes[1] || '').replace('Horário: ', '').trim().split('às');
        resultado.horaInicio = (horas[0] || '').trim();
        resultado.horaFim = (horas[1] || '').trim();

        resultado.observacoes = linhas.slice(1).join('\n').replace('Obs: ', '').trim();
    } catch (erro) {
        console.warn('Não foi possível ler todos os campos da solicitação.', erro);
    }
    return resultado;
}

/* ---------------- Listagem e acompanhamento ---------------- */

const etapasChamado = [
    { chave: 'pendente', nome: 'Enviado' },
    { chave: 'em_andamento', nome: 'Em análise' },
    { chave: 'finalizada', nome: 'Concluído' }
];

function montarTrilha(status) {
    let indiceAtual = etapasChamado.findIndex(e => e.chave === status);
    let classeTrilha = '';

    if (status === 'finalizada') { indiceAtual = etapasChamado.length - 1; classeTrilha = 'trilha-concluida'; }
    if (status === 'cancelada') { indiceAtual = 0; classeTrilha = 'trilha-cancelada'; }

    const etapas = status === 'cancelada'
        ? [{ chave: 'pendente', nome: 'Enviado' }, { chave: 'cancelada', nome: 'Cancelado' }]
        : etapasChamado;

    const indice = status === 'cancelada' ? 1 : indiceAtual;

    return `
        <div class="trilha-progresso ${classeTrilha}">
            ${etapas.map((etapa, i) => {
                let classe = '';
                if (i < indice) classe = 'concluida';
                else if (i === indice) classe = status === 'finalizada' || status === 'cancelada' ? 'concluida' : 'atual';
                return `
                    <div class="etapa ${classe}">
                        <span class="etapa-marcador"></span>
                        <span class="etapa-nome">${etapa.nome}</span>
                    </div>`;
            }).join('')}
        </div>`;
}

function filtrarSolicitacoes(filtro, botao) {
    filtroAtivo = filtro;
    document.querySelectorAll('.filtro').forEach(b => b.classList.remove('ativo'));
    botao.classList.add('ativo');
    carregarSolicitacoes();
}

function carregarSolicitacoes() {
    const usuario = obterUsuarioLogado();
    if (!usuario) return;

    const lista = document.getElementById('listaSolicitacoes');
    const minhas = obterSolicitacoes().filter(s => s.emailSolicitante === usuario.email);

    // Resumo por status
    const contar = status => minhas.filter(s => s.status === status).length;
    document.getElementById('resumoPendentes').textContent = contar('pendente');
    document.getElementById('resumoAndamento').textContent = contar('em_andamento');
    document.getElementById('resumoFinalizadas').textContent = contar('finalizada');
    document.getElementById('resumoCanceladas').textContent = contar('cancelada');

    let visiveis = [...minhas].reverse();
    if (filtroAtivo === 'abertas') visiveis = visiveis.filter(s => podeAlterar(s));
    if (filtroAtivo === 'encerradas') visiveis = visiveis.filter(s => !podeAlterar(s));

    if (visiveis.length === 0) {
        lista.innerHTML = `
            <div class="solicitacoes-vazio">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M8 13h8M8 17h5"/></svg>
                <strong>Nenhuma solicitação por aqui</strong>
                <span>Clique em “Nova solicitação” para pedir um equipamento ou serviço.</span>
            </div>`;
        return;
    }

    lista.innerHTML = visiveis.map((s, indice) => {
        const dados = extrairDados(s);
        const alteravel = podeAlterar(s);

        const acoes = alteravel ? `
            <div class="solicitacao-acoes">
                <button class="botao-acao" title="Editar" onclick="editarSolicitacao('${s.id}')">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
                <button class="botao-acao botao-acao--excluir" title="Excluir" onclick="excluirSolicitacao('${s.id}')">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
                </button>
            </div>`
            : `<span class="solicitacao-bloqueada">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                    Encerrada
               </span>`;

        const rotulosStatus = { pendente: 'Aguardando a TI', em_andamento: 'Em análise', finalizada: 'Concluída', cancelada: 'Cancelada' };

        return `
            <article class="cartao-solicitacao" style="animation-delay:${Math.min(indice * 0.05, 0.4)}s">
                <div class="solicitacao-topo">
                    <div class="solicitacao-identificacao">
                        <span class="etiqueta-status etiqueta-status--${s.status}">${rotulosStatus[s.status] || s.status}</span>
                        <h3 class="solicitacao-titulo">${escaparHtml(dados.equipamento)}</h3>
                        <span class="solicitacao-protocolo">Protocolo #${String(s.id).slice(-6)}</span>
                    </div>
                    ${acoes}
                </div>

                <div class="solicitacao-dados">
                    <div class="dado-item">
                        <span class="dado-rotulo">Local</span>
                        <span class="dado-valor">${escaparHtml(dados.sala) || '—'}</span>
                    </div>
                    <div class="dado-item">
                        <span class="dado-rotulo">Data de uso</span>
                        <span class="dado-valor">${formatarData(s.dataUso)}</span>
                    </div>
                    <div class="dado-item">
                        <span class="dado-rotulo">Horário</span>
                        <span class="dado-valor">${dados.horaInicio && dados.horaFim ? `${dados.horaInicio} às ${dados.horaFim}` : '—'}</span>
                    </div>
                    <div class="dado-item">
                        <span class="dado-rotulo">Responsável</span>
                        <span class="dado-valor">${escaparHtml(s.assignee && s.assignee !== 'Não atribuído' ? s.assignee : 'A definir')}</span>
                    </div>
                </div>

                ${dados.observacoes ? `<p class="solicitacao-observacoes">${escaparHtml(dados.observacoes)}</p>` : ''}

                ${montarTrilha(s.status)}
            </article>`;
    }).join('');
}

/* ---------------- Inicialização ---------------- */

window.addEventListener('load', () => {
    if (localStorage.getItem('portal_usuarioLogado')) iniciarPortal();
});
