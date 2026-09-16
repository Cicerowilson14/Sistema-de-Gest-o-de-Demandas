/* =========================================================
   PAINEL DE DEMANDAS TI — CECAPE
   Lógica da aplicação (mantém o schema de dados original:
   localStorage 'demanda_user' / 'kanban_cards', campos
   dataUso e emailSolicitante usados pelo portal de chamados)
========================================================= */

const currentUser = localStorage.getItem('demanda_user');
if (!currentUser) window.location.href = 'login.html';

const semAnimacao = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ================= LISTA DA EQUIPE DE TI =================
const equipeTI = ["TI (Setor)", "Wilson", "Gleydson", "Davy", "Jonatas", "Charles"];
// ===========================================================

let cards = JSON.parse(localStorage.getItem('kanban_cards')) || [];
let instanciaGraficoStatus = null;
let instanciaGraficoResolutores = null;

/* ---------------- Utilidades de exibição ---------------- */

function formatarData(dataString) {
    if (!dataString) return 'Sem prazo';
    const partes = dataString.split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : dataString;
}

function formatarDataHora(dataObjeto) {
    if (!dataObjeto) return '-';
    return new Date(dataObjeto).toLocaleString('pt-BR');
}

function obterIniciais(nome) {
    if (!nome) return '?';
    const partes = nome.trim().split(/\s+/);
    return partes.length === 1 ? partes[0].slice(0, 2).toUpperCase() : (partes[0][0] + partes[1][0]).toUpperCase();
}

function obterCorAvatar(nome) {
    let hash = 0;
    for (let i = 0; i < (nome || '').length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
    const matiz = Math.abs(hash) % 360;
    return `hsl(${matiz}, 62%, 52%)`;
}

function animarContador(elemento, valorFinal, sufixo = '') {
    const inicio = 0;
    const duracao = semAnimacao ? 0 : 650;
    const t0 = performance.now();
    function passo(agora) {
        const progresso = duracao === 0 ? 1 : Math.min((agora - t0) / duracao, 1);
        const suavizado = 1 - Math.pow(1 - progresso, 3);
        elemento.textContent = Math.round(inicio + (valorFinal - inicio) * suavizado) + sufixo;
        if (progresso < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
}

function aplicarInclinacao3D(elemento) {
    if (semAnimacao) return;
    elemento.addEventListener('mousemove', (e) => {
        const r = elemento.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        elemento.style.transform = `perspective(800px) rotateX(${(-y * 4.5).toFixed(2)}deg) rotateY(${(x * 4.5).toFixed(2)}deg) translateY(-2px)`;
    });
    elemento.addEventListener('mouseleave', () => { elemento.style.transform = ''; });
}

/* ---------------- Navegação entre abas ---------------- */

function alternarAba(nomeAba) {
    document.querySelectorAll('.secao-vista').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.aba').forEach(el => el.classList.remove('ativo'));

    document.getElementById(`vista-${nomeAba}`).style.display = 'block';
    document.querySelector(`.aba[data-aba="${nomeAba}"]`).classList.add('ativo');
    document.getElementById('botaoNovaDemanda').style.display = nomeAba === 'kanban' ? 'inline-block' : 'none';

    if (nomeAba === 'kanban') renderizarQuadro();
    if (nomeAba === 'relatorios') renderizarRelatorios();
}

/* ---------------- Quadro Kanban ---------------- */

function renderizarQuadro() {
    const colunas = {
        pendente: document.getElementById('coluna-pendente'),
        em_andamento: document.getElementById('coluna-em_andamento'),
        finalizada: document.getElementById('coluna-finalizada'),
        cancelada: document.getElementById('coluna-cancelada')
    };
    Object.values(colunas).forEach(c => { if (c) c.innerHTML = ''; });

    const contagens = { pendente: 0, em_andamento: 0, finalizada: 0, cancelada: 0 };
    const cartoesVisiveis = cards.filter(c => !c.deletedFromBoard);
    let indiceGlobal = 0;

    const mensagensVazias = {
        pendente: 'Nenhuma demanda pendente.',
        em_andamento: 'Nada em andamento no momento.',
        finalizada: 'Nenhuma demanda finalizada ainda.',
        cancelada: 'Nenhuma demanda cancelada.'
    };

    Object.keys(colunas).forEach(status => {
        const doStatus = cartoesVisiveis.filter(c => (colunas[c.status] ? c.status : 'pendente') === status);
        contagens[status] = doStatus.length;

        if (doStatus.length === 0 && colunas[status]) {
            colunas[status].innerHTML = `
                <div class="estado-vazio">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8"/></svg>
                    <span>${mensagensVazias[status]}</span>
                </div>`;
            return;
        }

        doStatus.forEach(card => {
            const elemento = criarElementoCartao(card, indiceGlobal);
            colunas[status].appendChild(elemento);
            aplicarInclinacao3D(elemento);
            indiceGlobal++;
        });
    });

    Object.keys(contagens).forEach(status => {
        const el = document.getElementById(`contagem-${status}`);
        if (el) el.textContent = contagens[status];
    });
}

function obterListaResponsaveis(card) {
    const bruto = card.assignee || (card.assignees ? card.assignees.join(', ') : '') || '';
    return bruto && bruto !== 'Não atribuído' ? bruto.split(',').map(s => s.trim()).filter(Boolean) : [];
}

function criarElementoCartao(card, indice) {
    const responsaveis = obterListaResponsaveis(card);

    const responsaveisHtml = responsaveis.length === 0
        ? `<span class="sem-responsavel">Não atribuído</span>`
        : responsaveis.map(nome => `
            <span class="etiqueta-responsavel">
                <span class="etiqueta-avatar" style="background:${obterCorAvatar(nome)}">${obterIniciais(nome)}</span>
                ${nome}
                <button class="botao-remover-responsavel" onclick="removerResponsavel(${card.id}, '${nome}')" title="Remover ${nome}">&times;</button>
            </span>`).join('');

    const disponiveis = equipeTI.filter(m => !responsaveis.includes(m));
    const selectHtml = disponiveis.length > 0 ? `
        <div class="adicionar-responsavel">
            <select id="selecionarResponsavel-${card.id}" class="select-responsavel">
                <option value="">+ Adicionar responsável…</option>
                ${disponiveis.map(m => `<option value="${m}">${m}</option>`).join('')}
            </select>
            <button class="botao-adicionar" onclick="adicionarResponsavel(${card.id})">+</button>
        </div>` : '';

    const podeAssumir = equipeTI.includes(currentUser) && !responsaveis.includes(currentUser);
    const assumirHtml = podeAssumir ? `<button class="botao-assumir" onclick="assumirDemanda(${card.id})">Assumir esta demanda</button>` : '';

    const dataUsoHtml = card.dataUso ? `<div class="info-linha info-urgente"><strong>Data de uso:</strong> ${formatarData(card.dataUso)}</div>` : '';
    const emailHtml = card.emailSolicitante ? `<div class="info-linha"><strong>E-mail:</strong> ${card.emailSolicitante}</div>` : '';
    const prazoHtml = card.deadline ? `<div class="info-linha"><strong>Prazo:</strong> ${formatarData(card.deadline)}</div>` : '';

    let fechamentoHtml = '';
    if (card.status === 'finalizada' || card.status === 'cancelada') {
        fechamentoHtml = `
            <hr class="divisor">
            <div class="info-linha"><strong>Fechado por:</strong> ${card.completedBy || '-'}</div>
            <div class="info-linha"><strong>Em:</strong> ${formatarDataHora(card.completedAt)}</div>`;
    }

    const elemento = document.createElement('div');
    elemento.className = 'cartao-demanda';
    elemento.dataset.prioridade = card.priority;
    elemento.style.animationDelay = `${Math.min(indice * 0.045, 0.5)}s`;
    elemento.innerHTML = `
        <div class="cartao-cabecalho">
            <span class="etiqueta-prioridade">${card.priority.charAt(0).toUpperCase() + card.priority.slice(1)}</span>
            <button class="botao-icone" title="Retirar do quadro" onclick="excluirCartao(${card.id})">&times;</button>
        </div>
        <h4 class="cartao-titulo">${card.title}</h4>
        <p class="cartao-descricao">${(card.description || '').replace(/\n/g, '<br>')}</p>
        <div class="cartao-meta">
            <div class="bloco-responsaveis">
                <div class="bloco-responsaveis-topo">
                    <strong>Responsáveis:</strong>
                    <div class="lista-responsaveis">${responsaveisHtml}</div>
                </div>
                ${selectHtml}
                ${assumirHtml}
            </div>
            <hr class="divisor">
            ${prazoHtml}
            ${dataUsoHtml}
            ${emailHtml}
            <div class="info-linha"><strong>Criado por:</strong> ${card.createdBy}</div>
            ${fechamentoHtml}
        </div>
        <select class="select-status" onchange="atualizarStatus(${card.id}, this.value)">
            <option value="pendente" ${card.status === 'pendente' ? 'selected' : ''}>Pendente</option>
            <option value="em_andamento" ${card.status === 'em_andamento' ? 'selected' : ''}>Em andamento</option>
            <option value="finalizada" ${card.status === 'finalizada' ? 'selected' : ''}>Finalizada</option>
            <option value="cancelada" ${card.status === 'cancelada' ? 'selected' : ''}>Cancelada</option>
        </select>
    `;
    return elemento;
}

/* ---------------- Responsáveis ---------------- */

function adicionarResponsavel(id) {
    const select = document.getElementById(`selecionarResponsavel-${id}`);
    if (!select || !select.value) return;
    const card = cards.find(c => c.id == id);
    if (!card) return;
    const responsaveis = obterListaResponsaveis(card);
    if (!responsaveis.includes(select.value)) {
        responsaveis.push(select.value);
        card.assignee = responsaveis.join(', ');
        salvarDados();
        renderizarQuadro();
    }
}

function removerResponsavel(id, nome) {
    const card = cards.find(c => c.id == id);
    if (!card) return;
    const responsaveis = obterListaResponsaveis(card).filter(n => n !== nome);
    card.assignee = responsaveis.length ? responsaveis.join(', ') : 'Não atribuído';
    salvarDados();
    renderizarQuadro();
}

function assumirDemanda(id) {
    const card = cards.find(c => c.id == id);
    if (!card) return;
    const responsaveis = obterListaResponsaveis(card);
    if (!responsaveis.includes(currentUser)) {
        responsaveis.push(currentUser);
        card.assignee = responsaveis.join(', ');
        salvarDados();
        renderizarQuadro();
    }
}

/* ---------------- Criação e atualização de demandas ---------------- */

document.getElementById('formularioDemanda').addEventListener('submit', function (e) {
    e.preventDefault();
    const bruto = document.getElementById('campoResponsaveis').value;
    const responsaveisFormatados = bruto ? bruto.split(',').map(s => s.trim()).filter(Boolean).join(', ') : 'Não atribuído';

    cards.push({
        id: Date.now(),
        title: document.getElementById('campoTitulo').value,
        description: document.getElementById('campoDescricao').value,
        priority: document.getElementById('campoPrioridade').value,
        assignee: responsaveisFormatados,
        deadline: document.getElementById('campoPrazo').value,
        status: 'pendente',
        createdBy: currentUser,
        createdAt: new Date().toISOString(),
        completedBy: null,
        completedAt: null,
        deletedFromBoard: false
    });

    salvarDados();
    renderizarQuadro();
    fecharModal();
    this.reset();
});

function atualizarStatus(id, novoStatus) {
    const card = cards.find(c => c.id == id);
    if (!card) return;
    card.status = novoStatus;
    if (novoStatus === 'finalizada' || novoStatus === 'cancelada') {
        card.completedBy = currentUser;
        card.completedAt = new Date().toISOString();
    } else {
        card.completedBy = null;
        card.completedAt = null;
    }
    salvarDados();
    renderizarQuadro();
}

function excluirCartao(id) {
    if (!confirm('Deseja retirar esta demanda do quadro?\nEla continuará salva em Relatórios & histórico.')) return;
    const card = cards.find(c => c.id == id);
    if (card) {
        card.deletedFromBoard = true;
        salvarDados();
        renderizarQuadro();
    }
}

/* ---------------- Relatórios ---------------- */

function configurarFiltroResolutor() {
    const select = document.getElementById('filtroResolutor');
    if (!select) return;
    const valorAtual = select.value || 'all';
    select.innerHTML = `<option value="all">Setor inteiro (consolidado)</option>` +
        equipeTI.map(m => `<option value="${m}">${m}</option>`).join('');
    if ([...select.options].some(o => o.value === valorAtual)) select.value = valorAtual;
}

function renderizarRelatorios() {
    configurarFiltroResolutor();

    const total = cards.length;
    const finalizadas = cards.filter(c => c.status === 'finalizada');
    const percentual = total === 0 ? 0 : Math.round((finalizadas.length / total) * 100);
    const rapidas = finalizadas.filter(c => (new Date(c.completedAt) - new Date(c.createdAt)) < 86400000).length;
    const minhas = finalizadas.filter(c => c.completedBy === currentUser).length;

    animarContador(document.getElementById('estatisticaTotal'), total);
    animarContador(document.getElementById('estatisticaPercentual'), percentual, '%');
    animarContador(document.getElementById('estatisticaRapidas'), rapidas);
    animarContador(document.getElementById('estatisticaMinhas'), minhas);

    const circunferencia = 238.76;
    const circulo = document.getElementById('circuloProgresso');
    if (circulo) circulo.style.strokeDashoffset = circunferencia - (circunferencia * percentual) / 100;

    renderizarGraficos();
    renderizarTabelaHistorico();
}

function corTextoGraficos() { return getComputedStyle(document.body).getPropertyValue('--cor-texto-suave').trim() || '#8b96ac'; }

function renderizarGraficos() {
    const contagens = {
        pendente: cards.filter(c => c.status === 'pendente').length,
        em_andamento: cards.filter(c => c.status === 'em_andamento').length,
        finalizada: cards.filter(c => c.status === 'finalizada').length
    };

    const ctxStatus = document.getElementById('graficoStatus').getContext('2d');
    if (instanciaGraficoStatus) instanciaGraficoStatus.destroy();
    instanciaGraficoStatus = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['Pendentes', 'Em andamento', 'Finalizadas'],
            datasets: [{ data: [contagens.pendente, contagens.em_andamento, contagens.finalizada], backgroundColor: ['#f5a524', '#16b8a6', '#22c55e'], borderColor: '#121a2b', borderWidth: 2 }]
        },
        options: { plugins: { legend: { labels: { color: corTextoGraficos() } } }, maintainAspectRatio: false }
    });

    atualizarGraficoResolutores();
}

function atualizarGraficoResolutores() {
    const finalizadas = cards.filter(c => c.status === 'finalizada');
    const select = document.getElementById('filtroResolutor');
    const selecionado = select ? select.value : 'all';

    let rotulos = [];
    let dados = [];

    if (selecionado === 'all' || !selecionado) {
        const mapa = {};
        equipeTI.forEach(m => { mapa[m] = 0; });
        finalizadas.forEach(c => {
            let responsaveis = obterListaResponsaveis(c);
            if (responsaveis.length === 0 && c.completedBy) responsaveis = [c.completedBy];
            responsaveis.forEach(r => { if (mapa[r] !== undefined) mapa[r] += 1; });
        });
        rotulos = Object.keys(mapa);
        dados = rotulos.map(r => mapa[r]);
    } else {
        rotulos = ['Alta', 'Média', 'Baixa'];
        const doUsuario = finalizadas.filter(c => obterListaResponsaveis(c).includes(selecionado) || c.completedBy === selecionado);
        dados = [
            doUsuario.filter(c => c.priority === 'alta').length,
            doUsuario.filter(c => c.priority === 'media').length,
            doUsuario.filter(c => c.priority === 'baixa').length
        ];
    }

    const ctxUsuario = document.getElementById('graficoResolutores').getContext('2d');
    if (instanciaGraficoResolutores) instanciaGraficoResolutores.destroy();
    instanciaGraficoResolutores = new Chart(ctxUsuario, {
        type: 'bar',
        data: {
            labels: rotulos,
            datasets: [{
                label: selecionado === 'all' ? 'Demandas resolvidas por pessoa' : `Demandas resolvidas (${selecionado})`,
                data: dados,
                backgroundColor: '#ff7a45',
                borderRadius: 6
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true, ticks: { color: corTextoGraficos(), stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { ticks: { color: corTextoGraficos() }, grid: { display: false } }
            },
            plugins: { legend: { labels: { color: corTextoGraficos() } } },
            maintainAspectRatio: false
        }
    });
}

/* ---------------- Histórico e exportação ---------------- */

const rotulosStatus = { pendente: 'Pendente', em_andamento: 'Em andamento', finalizada: 'Finalizada', cancelada: 'Cancelada' };

function renderizarTabelaHistorico() {
    const corpo = document.getElementById('corpoTabelaHistorico');
    corpo.innerHTML = '';
    const checkTudo = document.getElementById('selecionarTudo');
    if (checkTudo) checkTudo.checked = false;

    const ordenados = [...cards].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    corpo.innerHTML = ordenados.map(c => `
        <tr>
            <td><input type="checkbox" class="hist-chk" value="${c.id}"></td>
            <td><span class="etiqueta-status etiqueta-visibilidade ${c.deletedFromBoard ? '' : 'etiqueta-visibilidade--ativa'}">${c.deletedFromBoard ? 'Arquivada' : 'No quadro'}</span></td>
            <td>${c.title}</td>
            <td><span class="etiqueta-status etiqueta-status--${c.status}">${rotulosStatus[c.status] || c.status}</span></td>
            <td style="text-transform:capitalize">${c.priority}</td>
            <td><strong>${c.assignee || 'Não atribuído'}</strong></td>
            <td>${c.createdBy}</td>
            <td>${formatarDataHora(c.createdAt)}</td>
            <td>${c.completedBy || '-'}</td>
            <td>${formatarDataHora(c.completedAt)}</td>
        </tr>`).join('');
}

function alternarSelecaoTudo(origem) {
    document.querySelectorAll('.hist-chk').forEach(cb => cb.checked = origem.checked);
}

function excluirHistoricoSelecionado() {
    const selecionados = [...document.querySelectorAll('.hist-chk:checked')].map(cb => parseInt(cb.value));
    if (selecionados.length === 0) return alert('Selecione pelo menos uma demanda.');
    if (!confirm('Atenção: apagar permanentemente as demandas selecionadas?')) return;
    cards = cards.filter(c => !selecionados.includes(c.id));
    salvarDados();
    renderizarRelatorios();
    renderizarQuadro();
}

function alternarCampoFiltro() {
    const tipo = document.getElementById('tipoFiltroExclusao').value;
    document.getElementById('filtroMes').style.display = tipo === 'month' ? 'inline-block' : 'none';
    document.getElementById('filtroDia').style.display = tipo === 'day' ? 'inline-block' : 'none';
}

function excluirPorFiltro() {
    const tipo = document.getElementById('tipoFiltroExclusao').value;
    let mensagem = '';
    let filtro = null;

    if (tipo === 'all') {
        mensagem = 'Atenção: apagar TODO O HISTÓRICO permanentemente?';
        filtro = () => false;
    } else if (tipo === 'month') {
        const valor = document.getElementById('filtroMes').value;
        if (!valor) return alert('Selecione um mês.');
        mensagem = `Apagar permanentemente todas as demandas do mês ${valor}?`;
        filtro = c => !c.createdAt.startsWith(valor);
    } else if (tipo === 'day') {
        const valor = document.getElementById('filtroDia').value;
        if (!valor) return alert('Selecione um dia.');
        mensagem = `Apagar permanentemente todas as demandas do dia ${valor}?`;
        filtro = c => !c.createdAt.startsWith(valor);
    }

    if (!confirm(mensagem)) return;
    cards = cards.filter(filtro);
    salvarDados();
    renderizarRelatorios();
    renderizarQuadro();
}

function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(cards);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Demandas');
    XLSX.writeFile(wb, 'historico_demandas.xlsx');
}

function exportarPDF() {
    const elemento = document.getElementById('conteudo-relatorio');
    html2pdf().set({
        margin: 0.5,
        filename: 'relatorio_demandas.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
    }).from(elemento).save();
}

/* ---------------- Persistência e sessão ---------------- */

function salvarDados() { localStorage.setItem('kanban_cards', JSON.stringify(cards)); }

function abrirModal() { document.getElementById('modalDemanda').classList.add('aberto'); }
function fecharModal() { document.getElementById('modalDemanda').classList.remove('aberto'); }

function sair() {
    localStorage.removeItem('demanda_user');
    window.location.href = 'login.html';
}

/* ---------------- Inicialização ---------------- */

if (currentUser) {
    document.getElementById('nomeUsuario').textContent = currentUser;
    const avatar = document.getElementById('avatarUsuario');
    avatar.textContent = obterIniciais(currentUser);
    avatar.style.background = `linear-gradient(135deg, ${obterCorAvatar(currentUser)}, var(--cor-info-forte))`;
}

renderizarQuadro();
