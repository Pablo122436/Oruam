document.addEventListener('DOMContentLoaded', function() {
    // Função para gerenciar background responsivo
    function updateBackground() {
        const body = document.body;
        const screenWidth = window.innerWidth;
        
        // Remover classes existentes
        body.classList.remove('desktop', 'mobile');
        
        if (screenWidth <= 768) {
            // Dispositivos móveis - Background 2
            body.classList.add('mobile');
            console.log('Background mudou para Mobile (Background2)');
        } else {
            // Dispositivos maiores - Background 1
            body.classList.add('desktop');
            console.log('Background mudou para Desktop (Background1)');
        }
    }
    
    // Atualizar background no carregamento
    updateBackground();
    
    // Atualizar background quando redimensionar a tela
    window.addEventListener('resize', function() {
        updateBackground();
    });
    
    // Debug: verificar se as imagens existem
    function checkImages() {
        const img1 = new Image();
        const img2 = new Image();
        
        img1.onload = function() {
            console.log('Background1.png carregado com sucesso');
        };
        img1.onerror = function() {
            console.error('Erro ao carregar Background1.png - verifique se o arquivo existe em img/');
        };
        img1.src = 'img/Background1.png';
        
        img2.onload = function() {
            console.log('Background2.png carregado com sucesso');
        };
        img2.onerror = function() {
            console.error('Erro ao carregar Background2.png - verifique se o arquivo existe em img/');
        };
        img2.src = 'img/Background2.png';
    }
    
    // Verificar imagens
    checkImages();
    
    // Elementos DOM
    const donationForm = document.getElementById('donation-form');
    const qrSection = document.getElementById('qr-section');
    const qrCodeImg = document.getElementById('qr-code-img');
    const pixCodeText = document.getElementById('pix-code-text');
    const copyPixBtn = document.getElementById('copy-pix-btn');
    const paymentInfo = document.getElementById('payment-info');
    const simulateSection = document.getElementById('simulate-section');
    const simulatePaymentBtn = document.getElementById('simulate-payment-btn');
    const notification = document.getElementById('notification');
    const oruamCharacter = document.getElementById('oruam-character');
    const oruamText = document.getElementById('oruam-text');
    const totalDonorsSpan = document.getElementById('total-donors');
    const rankingList = document.getElementById('ranking-list');
    const slotReel = document.getElementById('slot-reel');
    const viewAllBtn = document.getElementById('view-all-supporters-btn');
    const supportersModal = document.getElementById('supporters-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const supportersList = document.getElementById('supporters-list');
    const supporterSearch = document.getElementById('supporter-search');
    const clearSearchBtn = document.getElementById('clear-search');
    
    // Variáveis globais
    let currentPaymentId = null;
    let currentPaymentAmount = 0; // Adicionar variável para armazenar o valor atual
    let paymentCheckInterval = null;
    let currentDonorIndex = 0;
    let recentDonations = []; // Array para doações reais
    let allSupporters = []; // Array para armazenar todos os apoiadores
    
    // Lista de frases do Oruam
    const oruamPhrases = [
        'Cardique',
        'An com o Oruam',
        'Fé minha tropa',
        'An Quem',
        'Vou me entregar tropa',
        'Quero ver pegar no complexo',
        'Herói dentro das grades',
        'Nois é artista',
        'Ela quer da, a buteta',
        'Na rlk do Oruam',
        'Vermelhão do ódio',
        'Mauro ou Oruam',
        'Vou vencer na música'
    ];
    
    // Função para alterar texto do Oruam
    function changeOruamText() {
        const randomIndex = Math.floor(Math.random() * oruamPhrases.length);
        oruamText.style.animation = 'none';
        setTimeout(() => {
            oruamText.textContent = oruamPhrases[randomIndex];
            oruamText.style.animation = 'fadeInOut 0.5s ease-in-out';
        }, 50);
    }
    
    // Alterar texto a cada 3 segundos
    setInterval(changeOruamText, 3000);

    // Função para carregar doações recentes reais
    async function loadRecentDonations() {
        try {
            const response = await fetch('/recent-donations');
            if (response.ok) {
                recentDonations = await response.json();
                console.log('Doações reais carregadas:', recentDonations.length);
            } else {
                console.error('Erro ao carregar doações:', response.status);
                recentDonations = []; // Fallback para array vazio
            }
        } catch (error) {
            console.error('Erro ao buscar doações:', error);
            recentDonations = []; // Fallback para array vazio
        }
    }

    // Função para criar item do slot com dados reais
    function createSlotItem(donor, isActive = false) {
        if (!donor) {
            return `
                <div class="slot-item ${isActive ? 'active' : ''}">
                    <div class="slot-donor-info">
                        <span class="slot-position">-</span>
                        <div class="slot-name">Aguardando apoio...</div>
                    </div>
                    <div class="slot-amount">R$ 0,00</div>
                </div>
            `;
        }
        
        return `
            <div class="slot-item ${isActive ? 'active' : ''}">
                <div class="slot-donor-info">
                    <span class="slot-position">${donor.position}</span>
                    <div class="slot-name">${donor.name}</div>
                </div>
                <div class="slot-amount">${donor.amount}</div>
            </div>
        `;
    }
    
    // Função para atualizar exibição do slot com dados reais
    function updateSlotDisplay() {
        if (recentDonations.length === 0) {
            slotReel.innerHTML = createSlotItem(null, true);
            return;
        }
        
        const currentDonor = recentDonations[currentDonorIndex];
        slotReel.innerHTML = createSlotItem(currentDonor, true);
        
        // Próximo doador
        currentDonorIndex = (currentDonorIndex + 1) % recentDonations.length;
    }
    
    // Função para inicializar sistema de slots com dados reais
    async function initializeSlotSystem() {
        await loadRecentDonations();
        updateSlotDisplay();
        
        // Atualizar slot a cada 2 segundos
        setInterval(updateSlotDisplay, 2000);
        
        // Recarregar doações a cada 30 segundos
        setInterval(loadRecentDonations, 30000);
    }
    
    // Inicializar sistema de slots
    initializeSlotSystem();
    
    // Event listener para o personagem Oruam
    oruamCharacter.addEventListener('click', function() {
        // Mudar frase quando clicar
        changeOruamText();
        
        // Adicionar animação de clique
        this.style.transform = 'scale(0.9)';
        setTimeout(() => {
            this.style.transform = '';
        }, 100);
    });
    
    // Formatação de valores monetários
    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }
    
    // Mostrar notificação
    function showNotification(message) {
        notification.textContent = message;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
    
    // Carregar estatísticas
    async function loadStats() {
        try {
            console.log('📊 Carregando estatísticas...');
            const response = await fetch('/stats');
            const stats = await response.json();
            
            console.log('📊 Estatísticas recebidas:', stats);
            
            if (totalDonorsSpan) {
                const donors = stats.total_donors || 0;
                totalDonorsSpan.textContent = donors;
                console.log(`📊 Atualizando contador: ${donors} apoiadores`);
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            if (totalDonorsSpan) {
                totalDonorsSpan.textContent = '0';
            }
        }
    }
    
    // Carregar ranking
    async function loadRanking() {
        try {
            const response = await fetch('/ranking');
            const ranking = await response.json();
            
            if (rankingList) {
                if (ranking.length === 0) {
                    rankingList.innerHTML = '<li class="ranking-item"><div class="donor-info"><div class="donor-name">Nenhuma doação ainda</div></div></li>';
                } else {
                    rankingList.innerHTML = ranking.map((donor, index) => {
                        const position = index + 1;
                        let positionClass = '';
                        let crownIcon = '';
                        
                        if (position === 1) {
                            positionClass = 'top-1';
                            crownIcon = '<svg class="crown-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 12l3 1 3-4 3 4 3-1-2 4H5zm2.5-7L4 6l1.5 3h2zm9 0h2L20 6l-3.5 3z"/></svg>';
                        } else if (position === 2) {
                            positionClass = 'top-2';
                        } else if (position === 3) {
                            positionClass = 'top-3';
                        }
                        
                        return `
                            <li class="ranking-item">
                                ${crownIcon}
                                <div class="ranking-position">
                                    <span class="position-number ${positionClass}">${position}</span>
                                    <div class="donor-info">
                                        <div class="donor-name">${donor.donor_name}</div>
                                        <div class="donor-location">Apoiador</div>
                                    </div>
                                </div>
                                <div class="donation-amount">${formatCurrency(donor.total_amount)}</div>
                            </li>
                        `;
                    }).join('');
                }
            }
        } catch (error) {
            console.error('Erro ao carregar ranking:', error);
            if (rankingList) {
                rankingList.innerHTML = '<li class="ranking-item"><div class="donor-info"><div class="donor-name">Erro ao carregar ranking</div></div></li>';
            }
        }
    }

    // Carregar todos os apoiadores para o modal
    async function loadAllSupporters() {
        try {
            console.log('📋 Carregando todos os apoiadores...');
            const response = await fetch('/all-supporters');
            const supporters = await response.json();
            
            console.log('📋 Apoiadores recebidos:', supporters.length);
            
            // Armazenar os dados globalmente
            allSupporters = supporters;
            
            // Renderizar a lista
            renderSupportersList(allSupporters);
            
        } catch (error) {
            console.error('Erro ao carregar apoiadores:', error);
            if (supportersList) {
                supportersList.innerHTML = `
                    <div class="supporter-item">
                        <div class="supporter-info">
                            <div class="supporter-name">Erro ao carregar apoiadores</div>
                            <div class="supporter-details">Tente novamente mais tarde</div>
                        </div>
                    </div>
                `;
            }
        }
    }

    // Renderizar lista de apoiadores
    function renderSupportersList(supporters) {
        if (!supportersList) return;
        
        if (supporters.length === 0) {
            supportersList.innerHTML = `
                <div class="supporter-item">
                    <div class="supporter-info">
                        <div class="supporter-name">Nenhum apoiador encontrado</div>
                        <div class="supporter-details">Tente uma busca diferente ou seja o primeiro a apoiar!</div>
                    </div>
                </div>
            `;
        } else {
            supportersList.innerHTML = supporters.map((supporter, index) => {
                return `
                    <div class="supporter-item" style="animation-delay: ${index * 0.1}s">
                        <div class="supporter-info">
                            <div class="supporter-name">${supporter.donor_name}</div>
                            <div class="supporter-details">
                                <span>💝 ${supporter.donation_count} doação${supporter.donation_count > 1 ? 'ões' : ''}</span>
                            </div>
                        </div>
                        <div class="supporter-amount">${formatCurrency(supporter.total_amount)}</div>
                    </div>
                `;
            }).join('');
        }
    }

    // Filtrar apoiadores
    function filterSupporters(searchTerm) {
        const filtered = allSupporters.filter(supporter => 
            supporter.donor_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        renderSupportersList(filtered);
    }

    // Abrir modal
    function openSupportersModal() {
        // Limpar pesquisa
        if (supporterSearch) {
            supporterSearch.value = '';
        }
        if (clearSearchBtn) {
            clearSearchBtn.style.display = 'none';
        }
        
        loadAllSupporters();
        supportersModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Focar no campo de pesquisa após abrir
        setTimeout(() => {
            if (supporterSearch) {
                supporterSearch.focus();
            }
        }, 300);
    }

    // Fechar modal
    function closeSupportersModal() {
        supportersModal.classList.remove('show');
        document.body.style.overflow = '';
    }

    // Event listeners para o modal
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', openSupportersModal);
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeSupportersModal);
    }

    // Event listeners para o modal de disclaimer
    const disclaimerLink = document.getElementById('disclaimer-link');
    const disclaimerModal = document.getElementById('disclaimer-modal');
    const closeDisclaimerBtn = document.getElementById('close-disclaimer-modal');

    function openDisclaimerModal() {
        if (disclaimerModal) {
            disclaimerModal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeDisclaimerModal() {
        if (disclaimerModal) {
            disclaimerModal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    if (disclaimerLink) {
        disclaimerLink.addEventListener('click', (e) => {
            e.preventDefault();
            openDisclaimerModal();
        });
    }

    if (closeDisclaimerBtn) {
        closeDisclaimerBtn.addEventListener('click', closeDisclaimerModal);
    }

    // Fechar modal de disclaimer clicando fora
    if (disclaimerModal) {
        disclaimerModal.addEventListener('click', (e) => {
            if (e.target === disclaimerModal) {
                closeDisclaimerModal();
            }
        });
    }

    // Fechar modal clicando fora
    if (supportersModal) {
        supportersModal.addEventListener('click', (e) => {
            if (e.target === supportersModal) {
                closeSupportersModal();
            }
        });
    }

    // Fechar modal com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (supportersModal && supportersModal.classList.contains('show')) {
                closeSupportersModal();
            }
            if (disclaimerModal && disclaimerModal.classList.contains('show')) {
                closeDisclaimerModal();
            }
        }
    });

    // Event listeners para a pesquisa
    if (supporterSearch) {
        // Pesquisar enquanto digita
        supporterSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim();
            
            // Mostrar/ocultar botão de limpar
            if (clearSearchBtn) {
                clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
            }
            
            // Filtrar apoiadores
            filterSupporters(searchTerm);
        });

        // Limpar pesquisa ao pressionar Enter (opcional)
        supporterSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            supporterSearch.value = '';
            clearSearchBtn.style.display = 'none';
            filterSupporters(''); // Mostrar todos
            supporterSearch.focus();
        });
    }
    
    // Mostrar QR Code
    function showQRCode(data) {
        qrSection.classList.remove('hidden');
        
        // Armazenar o valor do pagamento atual
        currentPaymentAmount = data.amount || 0;
        
        if (data.qr_code_base64) {
            qrCodeImg.src = `data:image/png;base64,${data.qr_code_base64}`;
        }
        
        if (data.qr_code) {
            pixCodeText.textContent = data.qr_code;
        }
        
        // Mostrar informações do pagamento
        paymentInfo.classList.remove('hidden');
        
        // Verificar se data.payment_id ou data.id existe antes de usar startsWith
        const paymentId = data.payment_id || data.id;
        const isDemo = paymentId && paymentId.startsWith('DEMO_');
        
        // Definir currentPaymentId sempre que um QR Code for mostrado
        currentPaymentId = paymentId;
        
        const statusClass = data.status === 'approved' ? 'status-approved' : 
                           isDemo ? 'status-demo' : 'status-pending';
        
        const statusText = data.status === 'approved' ? '✅ Pago' : 
                          isDemo ? '🎭 Demonstração' : '⏳ Aguardando Pagamento';
        
        paymentInfo.innerHTML = `
            <div class="payment-status ${statusClass}">
                ${statusText}
            </div>
            <p><strong>ID do Pagamento:</strong> ${paymentId || 'N/A'}</p>
            <p><strong>Valor:</strong> ${formatCurrency(data.amount || 0)}</p>
        `;
        
        // Mostrar simulação se for DEMO
        if (isDemo) {
            simulateSection.classList.remove('hidden');
            // Para pagamentos DEMO, também iniciar verificação de status
            startPaymentStatusCheck(paymentId);
        }
        
        // Iniciar verificação de status se ID existir
        if (paymentId && !isDemo) {
            startPaymentStatusCheck(paymentId);
        }
    }
    
    // Verificar status do pagamento
    function startPaymentStatusCheck(paymentId) {
        currentPaymentId = paymentId;
        
        console.log(`🔍 Iniciando verificação de status para: ${paymentId}`);
        
        if (paymentCheckInterval) {
            clearInterval(paymentCheckInterval);
        }
        
        paymentCheckInterval = setInterval(async () => {
            try {
                const response = await fetch(`/payment-status/${paymentId}`);
                const data = await response.json();
                
                console.log(`📊 Status recebido para ${paymentId}:`, data);
                
                if (data.status === 'approved' || data.status === 'paid') {
                    clearInterval(paymentCheckInterval);
                    
                    const isDemo = data.is_demo || paymentId.startsWith('DEMO_');
                    const message = isDemo ? 
                        '🎉 Pagamento DEMO aprovado! Obrigado pela simulação!' : 
                        '🎉 Pagamento aprovado! Obrigado pela sua doação!';
                    
                    showNotification(message);
                    
                    // Mostrar modal de confirmação de pagamento
                    showPaymentSuccessModal(data.amount || currentPaymentAmount || 0);
                    
                    // Atualizar status na interface
                    const statusElement = paymentInfo.querySelector('.payment-status');
                    if (statusElement) {
                        statusElement.className = 'payment-status status-approved';
                        statusElement.textContent = isDemo ? '✅ Pago (Simulado)' : '✅ Pago';
                    }
                    
                    // Ocultar botão de simulação se for DEMO
                    if (isDemo) {
                        simulateSection.classList.add('hidden');
                    }
                    
                    // Recarregar dados
                    loadStats();
                    loadRanking();
                    loadRecentDonations();
                    
                    // Se o modal estiver aberto, atualizar também
                    if (supportersModal && supportersModal.classList.contains('show')) {
                        loadAllSupporters();
                    }
                }
            } catch (error) {
                console.error('Erro ao verificar status:', error);
            }
        }, 3000); // Verificar a cada 3 segundos
    }
    
    // Form de doação
    donationForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const amount = document.getElementById('amount').value;
        const donorName = document.getElementById('donor-name').value || 'Apoiador Anônimo';
        const donorEmail = document.getElementById('donor-email').value;
        
        if (!amount || amount <= 0) {
            showNotification('Por favor, insira um valor válido para a doação');
            return;
        }
        
        const generateBtn = document.getElementById('generate-pix-btn');
        generateBtn.disabled = true;
        generateBtn.textContent = 'Gerando PIX...';
        
        try {
            const response = await fetch('/create-pix-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    donor_name: donorName,
                    donor_email: donorEmail
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Erro ao gerar PIX');
            }
            
            showQRCode(data);
            showNotification('PIX gerado com sucesso!');
            
        } catch (error) {
            console.error('Erro:', error);
            showNotification('Erro ao gerar PIX: ' + error.message);
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Gerar PIX';
        }
    });
    
    // Copiar código PIX
    copyPixBtn.addEventListener('click', function() {
        const textToCopy = pixCodeText.textContent.trim();
        
        if (!textToCopy) {
            showNotification('Nenhum código PIX para copiar');
            return;
        }
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            showNotification('Código PIX copiado com sucesso!');
        }).catch(err => {
            console.error('Erro ao copiar texto: ', err);
            showNotification('Erro ao copiar código PIX');
        });
    });
    
    // Simular pagamento (apenas para DEMO)
    if (simulatePaymentBtn) {
        simulatePaymentBtn.addEventListener('click', async function() {
            if (!currentPaymentId) {
                showNotification('Nenhum pagamento ativo para simular');
                return;
            }
            
            if (!currentPaymentId.startsWith('DEMO_')) {
                showNotification('Só é possível simular pagamentos DEMO');
                return;
            }
            
            this.disabled = true;
            this.textContent = 'Simulando...';
            
            try {
                const response = await fetch(`/simulate-payment/${currentPaymentId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Erro ao simular pagamento');
                }
                
                showNotification('🎉 Pagamento simulado com sucesso!');
                
                // Atualizar status na interface
                const statusElement = paymentInfo.querySelector('.payment-status');
                if (statusElement) {
                    statusElement.className = 'payment-status status-approved';
                    statusElement.textContent = '✅ Pago (Simulado)';
                }
                
                // Ocultar botão de simulação
                simulateSection.classList.add('hidden');
                
                // Recarregar dados
                loadStats();
                loadRanking();
                loadRecentDonations();
                
                // Se o modal estiver aberto, atualizar também
                if (supportersModal && supportersModal.classList.contains('show')) {
                    loadAllSupporters();
                }
                loadRecentDonations(); // Atualizar o slot também
                
            } catch (error) {
                console.error('Erro:', error);
                showNotification('Erro ao simular pagamento: ' + error.message);
            } finally {
                this.disabled = false;
                this.textContent = '🎭 Simular Pagamento (DEMO)';
            }
        });
    }
    
    // Funções do Modal de Confirmação de Pagamento
    const paymentSuccessModal = document.getElementById('payment-success-modal');
    const closePaymentModalBtn = document.getElementById('close-payment-modal');
    const confirmedAmountSpan = document.getElementById('confirmed-amount');
    
    // Mostrar modal de confirmação de pagamento
    function showPaymentSuccessModal(amount) {
        // Atualizar o valor confirmado no modal
        if (confirmedAmountSpan) {
            confirmedAmountSpan.textContent = formatCurrency(amount);
        }
        
        // Mostrar o modal
        if (paymentSuccessModal) {
            paymentSuccessModal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }
    
    // Fechar modal de confirmação de pagamento
    function closePaymentSuccessModal() {
        if (paymentSuccessModal) {
            paymentSuccessModal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }
    
    // Event listeners para o modal de confirmação
    if (closePaymentModalBtn) {
        closePaymentModalBtn.addEventListener('click', closePaymentSuccessModal);
    }
    
    // Fechar modal clicando fora
    if (paymentSuccessModal) {
        paymentSuccessModal.addEventListener('click', (e) => {
            if (e.target === paymentSuccessModal) {
                closePaymentSuccessModal();
            }
        });
    }
    
    // Fechar modal com ESC (atualizar o listener existente)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (supportersModal && supportersModal.classList.contains('show')) {
                closeSupportersModal();
            } else if (paymentSuccessModal && paymentSuccessModal.classList.contains('show')) {
                closePaymentSuccessModal();
            }
        }
    });
    
    // Carregar dados iniciais
    loadStats();
    loadRanking();
    
    // Atualizar dados a cada 30 segundos
    setInterval(() => {
        loadStats();
        loadRanking();
    }, 30000);
    
    // Efeito de digitação no título (opcional)
    const title = document.querySelector('h1');
    if (title) {
        const originalText = title.textContent;
        title.textContent = '';
        
        let i = 0;
        const typingEffect = setInterval(() => {
            if (i < originalText.length) {
                title.textContent += originalText.charAt(i);
                i++;
            } else {
                clearInterval(typingEffect);
            }
        }, 100);
    }
});
