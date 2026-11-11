/* Convergas IT Ops — local data store (localStorage-backed, JSON seed) */
(function () {
  const KEY = 'convergas_itops_v2';

  const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 9);

  // impressoras reais da Convergas (pasta IMPRESSORAS) + links oficiais de driver
  const REAL_PRINTERS = [
    { id: 'pr1', name: 'Brother DCP-8157DN', ip: '', location: '', driverUrl: 'https://support.brother.com/g/b/downloadtop.aspx?c=br&lang=pt&prod=dcp8157dn_us', type: 'rede', status: 'ativo' },
    { id: 'pr2', name: 'Brother DCP-L5652DN', ip: '', location: '', driverUrl: 'https://support.brother.com/g/b/downloadtop.aspx?c=br&lang=pt&prod=dcpl5652dn_us', type: 'rede', status: 'ativo' },
    { id: 'pr3', name: 'Zebra ZD230', ip: '', location: 'Etiquetas', driverUrl: 'https://www.zebra.com/us/en/support-downloads/printers/desktop/ZD200d.html', type: 'usb', status: 'ativo' },
  ];

  // biblioteca de comandos operacionais (descrições e guias detalhados)
  const RICH_COMMANDS = [
    { id: 'cm1', title: 'Scan de sistema (SFC)', category: 'Sistema', admin: true, shell: 'CMD',
      desc: 'Verifica a integridade de todos os arquivos protegidos do Windows e repara automaticamente os que estiverem corrompidos ou alterados, usando cópias saudáveis em cache.',
      command: 'sfc /scannow',
      howto: 'Quando usar: erros aleatórios, travamentos ou recursos do Windows que param de funcionar.\nPasso a passo:\n1. Abra o Prompt de Comando como Administrador.\n2. Cole o comando e pressione Enter.\n3. Aguarde chegar a "Verificação 100% concluída" (5 a 20 min — não feche a janela).\nO que esperar: ele informa se encontrou e reparou problemas. Se disser que "não conseguiu reparar alguns arquivos", rode o DISM (RestoreHealth) e repita o SFC.' },
    { id: 'cm2', title: 'Limpar cache DNS', category: 'Rede', admin: false, shell: 'CMD',
      desc: 'Apaga o cache local de nomes (DNS), forçando o Windows a consultar os servidores DNS novamente. Corrige sites que não abrem mesmo com a internet funcionando.',
      command: 'ipconfig /flushdns',
      howto: 'Quando usar: um site específico não carrega, ou logo após mudar o DNS / apontar um domínio novo.\nPasso a passo: abra o CMD e cole o comando.\nResultado esperado: "Liberado com êxito o cache de resolução de DNS".\nDica: feche e reabra o navegador depois para garantir.' },
    { id: 'cm3', title: 'Ver configuração de IP', category: 'Rede', admin: false, shell: 'CMD',
      desc: 'Mostra os dados completos de rede de todas as interfaces: IP, máscara, gateway, servidores DNS, endereço físico (MAC) e se está usando DHCP.',
      command: 'ipconfig /all',
      howto: 'Quando usar: descobrir o IP da máquina, o gateway da rede ou quais DNS estão configurados.\nLeitura: procure "Endereço IPv4" (o IP da máquina) e "Gateway Padrão" (o roteador).\nDica: para ver só o IP, use ipconfig sem o /all.' },
    { id: 'cm4', title: 'Reset de rede (Winsock)', category: 'Rede', admin: true, shell: 'CMD',
      desc: 'Restaura o catálogo Winsock (a camada de sockets do Windows) ao padrão de fábrica. Resolve conexões "presas", erros de proxy/LSP e internet que parou após VPN ou antivírus.',
      command: 'netsh winsock reset',
      howto: 'Quando usar: a máquina diz estar conectada mas nada carrega, ou após remover uma VPN/antivírus que mexeu na rede.\nPasso a passo:\n1. CMD como Administrador.\n2. Cole o comando e Enter.\n3. REINICIE o computador (obrigatório para aplicar).\nCuidado: pode resetar configurações de proxy corporativo — confirme antes em ambientes gerenciados.' },
    { id: 'cm5', title: 'Listar processos', category: 'Diagnóstico', admin: false, shell: 'CMD',
      desc: 'Lista todos os processos em execução com o PID e o uso de memória de cada um — útil para identificar programas travados ou pesados.',
      command: 'tasklist',
      howto: 'Quando usar: identificar um programa travado ou que consome muita memória.\nFiltrar: tasklist | find "chrome" mostra só o que interessa.\nEncerrar um processo: taskkill /IM nome.exe /F (ex.: taskkill /IM chrome.exe /F).' },
    { id: 'cm6', title: 'Verificar disco (CHKDSK)', category: 'Sistema', admin: true, shell: 'CMD',
      desc: 'Examina o sistema de arquivos e a superfície do disco em busca de erros lógicos e setores defeituosos, corrigindo o que for possível.',
      command: 'chkdsk C: /f /r',
      howto: 'Quando usar: arquivos corrompidos, lentidão estranha ou suspeita de HD/SSD com defeito.\nPasso a passo:\n1. CMD como Administrador.\n2. Cole e Enter.\n3. Como o C: está em uso, ele pedirá para agendar no próximo boot — digite S e reinicie.\nCuidado: o /r pode levar horas em discos grandes; faça fora do horário de trabalho.' },
    { id: 'cm7', title: 'Reparar imagem do Windows (DISM)', category: 'Sistema', admin: true, shell: 'CMD',
      desc: 'Repara a imagem base de componentes do Windows baixando arquivos saudáveis do Windows Update. É o passo anterior ao SFC quando ele sozinho não resolve.',
      command: 'DISM /Online /Cleanup-Image /RestoreHealth',
      howto: 'Quando usar: quando o SFC encontra problemas mas avisa que "não conseguiu reparar".\nPasso a passo:\n1. CMD como Administrador (precisa de internet).\n2. Cole e Enter; aguarde (pode parecer travado em 20%/40% — é normal).\n3. Ao terminar, rode o SFC de novo para finalizar o reparo.' },
    { id: 'cm8', title: 'Testar conectividade (ping)', category: 'Diagnóstico', admin: false, shell: 'CMD',
      desc: 'Envia pacotes a um host e mede se ele responde e com qual latência — confirma se a internet ou um servidor estão acessíveis.',
      command: 'ping 8.8.8.8 -t',
      howto: 'Quando usar: diagnosticar se a internet caiu ou se um servidor está fora do ar.\nLeitura: "tempo=Xms" = respondendo; "Esgotado o tempo limite" = sem resposta.\nDica: o -t mantém o teste contínuo — pressione Ctrl+C para parar. Troque 8.8.8.8 por um site (ex.: ping convergas.com.br).' },
    { id: 'cm9', title: 'Reparar Office (Microsoft 365)', category: 'Office', admin: false, shell: 'Executar',
      desc: 'Corrige aplicativos do Microsoft 365 que não abrem, travam ou apresentam erros de licença, reinstalando os arquivos do pacote.',
      command: 'C:\\Program Files\\Common Files\\microsoft shared\\ClickToRun\\OfficeC2RClient.exe /update user',
      howto: 'Quando usar: Word/Excel/Outlook travando ou com erro de ativação.\nReparo Rápido (offline): Painel de Controle → Programas → Microsoft 365 → Alterar → Reparo Rápido.\nReparo Online (mais completo, precisa de internet): mesma tela, escolha Reparo Online.\nO comando ao lado força uma atualização do Office, que também resolve muitos casos — cole no Executar (Win+R).' },
    { id: 'cm10', title: 'Liberar e renovar IP', category: 'Rede', admin: false, shell: 'CMD',
      desc: 'Devolve o IP atual ao servidor DHCP e solicita um novo — resolve conflitos de IP e máquinas que não pegam endereço da rede.',
      command: 'ipconfig /release && ipconfig /renew',
      howto: 'Quando usar: a máquina não recebe IP (aparece "169.254.x.x") ou há conflito de endereço.\nPasso a passo: CMD, cole e Enter.\nObservação: você perderá a conexão por alguns segundos durante o release. Se possível, faça conectado por cabo.' },
    { id: 'cm11', title: 'Reiniciar spooler de impressão', category: 'Sistema', admin: true, shell: 'CMD',
      desc: 'Reinicia o serviço de spooler e destrava a fila de impressão — resolve impressoras "paradas" e documentos presos que não saem nem somem.',
      command: 'net stop spooler && net start spooler',
      howto: 'Quando usar: a impressora não imprime e os documentos ficam presos na fila.\nPasso a passo: CMD como Administrador, cole e Enter.\nLimpar a fila manualmente: pare o spooler, apague tudo em C:\\Windows\\System32\\spool\\PRINTERS e inicie o spooler de novo.' },
    { id: 'cm12', title: 'Aplicar políticas de grupo (GPO)', category: 'Sistema', admin: false, shell: 'CMD',
      desc: 'Força a aplicação imediata das políticas de grupo (GPO) e configurações do domínio/Intune, sem esperar o ciclo automático.',
      command: 'gpupdate /force',
      howto: 'Quando usar: depois de alterar uma política no domínio e querer aplicá-la na máquina agora.\nPasso a passo: CMD, cole e Enter.\nObservação: pode pedir logoff ou reinício se alguma política exigir.' },
    { id: 'cm13', title: 'Ver versão do Windows (winver)', category: 'Diagnóstico', admin: false, shell: 'Executar',
      desc: 'Abre uma janela com a edição e o número de build/versão exatos do Windows instalado — essencial para suporte e compatibilidade.',
      command: 'winver',
      howto: 'Quando usar: confirmar a versão do Windows (ex.: 22H2, 23H2) antes de instalar um software ou abrir um chamado.\nPasso a passo: tecle Win+R, digite winver e Enter.' },
  ];

  // QUALIDADE — certificações CATA válidas (planilha Controle de Certificados.xlsx, aba "Certificações - ATT")
  const CATA_CERTS = [
    { id: 'ct1', type: 'cata', name: 'Indicador de pressão (Hunan Huke)', number: '23101152', process: '2023MEC234', issueDate: '2023-10-31', expiryDate: '2026-10-31', viewUrl: '', lab: 'CATA Certificações (INMETRO)', labEmail: '', labPhone: '', notes: 'Fabricante Hunan Huke Manufacturing Co., Ltd.' },
    { id: 'ct2', type: 'cata', name: 'Suporte de cilindro individual (Convergas)', number: '26091902', process: '2026MEC115', issueDate: '2026-09-03', expiryDate: '2029-09-03', viewUrl: '', lab: 'CATA Certificações (INMETRO)', labEmail: '', labPhone: '', notes: 'Renovação do certificado anterior 23091114 (2023MEC239, venc. 2026-09-05). Fabricante Convergas Equipamentos e Serviços Ltda.' },
    { id: 'ct3', type: 'cata', name: 'Tubos de alta pressão (Convergas)', number: '24041163', process: '2024MEC006', issueDate: '2024-04-04', expiryDate: '2027-04-04', viewUrl: '', lab: 'CATA Certificações (INMETRO)', labEmail: '', labPhone: '', notes: 'Fabricante Convergas Equipamentos e Serviços Ltda (mesmo contrato das Conexões, 2024MEC006).' },
    { id: 'ct4', type: 'cata', name: 'Conexões (Convergas)', number: '24041164', process: '2024MEC006', issueDate: '2024-04-04', expiryDate: '2027-04-04', viewUrl: '', lab: 'CATA Certificações (INMETRO)', labEmail: '', labPhone: '', notes: 'Fabricante Convergas Equipamentos e Serviços Ltda.' },
    { id: 'ct5', type: 'cata', name: 'Receptáculo de abastecimento NGV2 (OMB Saleri)', number: '25011480', process: '2024MEC171', issueDate: '2025-01-15', expiryDate: '2028-01-15', viewUrl: '', lab: 'CATA Certificações (INMETRO)', labEmail: '', labPhone: '', notes: 'Fabricante OMB Saleri SPA.' },
    { id: 'ct6', type: 'cata', name: 'Eletroválvula de cilindro (OMB Saleri)', number: '25011481', process: '2024MEC171', issueDate: '2025-01-15', expiryDate: '2028-01-15', viewUrl: '', lab: 'CATA Certificações (INMETRO)', labEmail: '', labPhone: '', notes: 'Fabricante OMB Saleri SPA.' },
    { id: 'ct7', type: 'cata', name: 'Duto de baixa pressão, borracha nitrílica (Four Rubber)', number: '24111457', process: '2024MEC173', issueDate: '2024-11-29', expiryDate: '2027-11-29', viewUrl: '', lab: 'CATA Certificações (INMETRO)', labEmail: '', labPhone: '', notes: 'Fabricante Four Rubber Ind. e Com. de Borrachas e Plástico LTDA.' },
    { id: 'ct8', type: 'cata', name: 'Suporte de 4 cilindros, certificação nova (Convergas)', number: '25081675', process: '2025MEC092', issueDate: '2025-08-28', expiryDate: '2028-08-28', viewUrl: '', lab: 'CATA Certificações (INMETRO)', labEmail: '', labPhone: '', notes: 'Fabricante Convergas Equipamentos e Serviços Ltda.' },
    { id: 'ct9', type: 'cata', name: 'Redutor de pressão HPNGV58501 (ITT Enidine)', number: '25101702', process: '2025MEC222', issueDate: '2025-10-10', expiryDate: '2028-10-10', viewUrl: '', lab: 'CATA Certificações (INMETRO)', labEmail: '', labPhone: '', notes: 'Fabricante Itt Enidine Inc.' },
    { id: 'ct10', type: 'cata', name: 'Válvula de fechamento rápido em latão (Westport)', number: '26011759', process: '2025MEC223', issueDate: '2026-01-08', expiryDate: '2029-01-08', viewUrl: '', lab: 'CATA Certificações (INMETRO)', labEmail: '', labPhone: '', notes: 'Fabricante Westport Fuel Systems.' },
    { id: 'ct11', type: 'cata', name: 'Mangueira de baixa pressão crimpada (Convergas)', number: '25101701', process: '2025MEC224', issueDate: '2025-10-10', expiryDate: '2028-10-10', viewUrl: '', lab: 'CATA Certificações (INMETRO)', labEmail: '', labPhone: '', notes: 'Fabricante Convergas Equipamentos e Serviços Ltda.' },
    { id: 'ct12', type: 'cata', name: 'Válvula de abastecimento externa NBR (ITA Industrial)', number: '24041162', process: '2024Mec050', issueDate: '2024-04-04', expiryDate: '2027-04-04', viewUrl: '', lab: 'CATA Certificações (INMETRO)', labEmail: '', labPhone: '', notes: 'Fabricante ITA Industrial Ltda (marca ITA — código AN 520003). Válvula de abastecimento externa em latão, 20 MPa. Obs.: o PDF está nomeado "Convergas", mas o fabricante oficial do certificado é a ITA Industrial.' },
    { id: 'ct13', type: 'cata', name: 'Cilindros para GNV TP-1, aço SAE 4130 (Mat)', number: 'P2024-04A', process: 'P2024-04A', issueDate: '2026-05-17', expiryDate: '', viewUrl: '', lab: 'GC Certified (INMETRO)', labEmail: '', labPhone: '', notes: 'Confirmação de manutenção FOR-32 (1ª manutenção) — OCP 0062 GC Certified/CERTIFIED. Fabricante Mat Equipamento Para Gases Ltda. Família de cilindros 23–150 L, PS 200 bar, vida útil 20 anos. Sem data de validade no documento (confirmação de manutenção).' },
    { id: 'ct14', type: 'cata', name: 'Suporte de 4 cilindros, certificação anterior (Convergas)', number: '2208843', process: '', issueDate: '', expiryDate: '', viewUrl: '', lab: 'CATA Certificações (INMETRO)', labEmail: '', labPhone: '', notes: 'Fabricante Convergas Equipamentos e Serviços Ltda. Certificação ANTERIOR (substituída pela 25081675) — próxima do vencimento, mantida a pedido. Emissão/validade a preencher: PDF do certificado é escaneado (sem texto p/ extrair).' },
    { id: 'ct15', type: 'cata', name: 'Válvula de abastecimento com manípulo (Rodagás)', number: '24081371', process: '2024MEC025', issueDate: '2024-09-02', expiryDate: '2027-09-02', viewUrl: '', lab: 'CATA Certificações (INMETRO)', labEmail: '', labPhone: '', notes: 'Fabricante Rodagás do Brasil — Sistemas a gás LTDA.' },
    { id: 'ct16', type: 'cata', name: 'Indicador de pressão (Wika)', number: '24031156', process: '2024MEC062', issueDate: '2024-03-22', expiryDate: '2027-03-22', viewUrl: '', lab: 'CATA Certificações (INMETRO)', labEmail: '', labPhone: '', notes: 'Fabricante Wika do Brasil Indústria e Comércio LTDA.' },
    { id: 'ct17', type: 'cata', name: 'Válvula do cilindro (Rodagás)', number: '24081373', process: '2024MEC075', issueDate: '2024-09-02', expiryDate: '2027-09-02', viewUrl: '', lab: 'CATA Certificações (INMETRO)', labEmail: '', labPhone: '', notes: 'Fabricante Rodagás do Brasil — Sistemas a gás LTDA.' },
    { id: 'ct18', type: 'cata', name: 'Cilindro de alta pressão para GNV (Anhui Clean Energy)', number: '26071866', process: '2026MEC019', issueDate: '2026-07-13', expiryDate: '2029-07-13', viewUrl: '', lab: 'CATA Certificações (INMETRO)', labEmail: '', labPhone: '', notes: 'Fabricante Anhui Clean Energy Co., Ltd. Cilindro de alta pressão para armazenamento de GNV a bordo de veículos automotores.' },
    { id: 'ct19', type: 'cata', name: 'Redutor de pressão (Rodagás)', number: '24081369', process: '2024MEC075', issueDate: '2024-09-02', expiryDate: '2027-09-02', viewUrl: '', lab: 'CATA Certificações (INMETRO)', labEmail: '', labPhone: '', notes: 'Fabricante Rodagás do Brasil — Sistemas a gás LTDA. Mesmo contrato (2024MEC075) da Válvula do cilindro (24081373).' },
    { id: 'ct20', type: 'cata', name: 'Cilindro de alta pressão para GNV (Gifel)', number: '26031810', process: '2025MEC099', issueDate: '2026-03-30', expiryDate: '2029-03-30', viewUrl: '', lab: 'CATA Certificações (INMETRO)', labEmail: '', labPhone: '', notes: 'Fabricante Gifel. Cilindro de alta pressão para armazenamento de GNV a bordo de veículos.' },
  ];

  // QUALIDADE — calibração de equipamentos de medição.
  // Fonte ÚNICA: planilha-mestre CONTROLE_CALIBRAÇÃO_EQUIPAMENTOS_MEDIÇÃO1.xlsx (aba "Obs. Técnicas").
  // Regras: só entram os equipamentos CALIBRADOS (vencidos OMITIDOS). PDF anexado só quando
  // encontrado e com certeza de que é dele (ver assets/certs e EQUIP_PDF_NUMS em app.js).
  // Os 6 registros EM 010/016/017/019/025/029 ficam SEM PDF: o certificado disponível é de 2025,
  // anterior à data de calibração registrada na planilha. Atualizado via scripts/atualizar-equip-2026.mjs.
  const mkViewUrl = (num) => 'assets/certs/' + num.replace(/\//g, '.') + '.pdf';
  const EQUIP_CERTS = [
    // --- Calibrados COM PDF ---
    { id: 'ce_em002', type: 'equipamento', name: "CALIBRE TAMPÃO CILINDRO GNV 3/4\" NGT - 14 FIOS", tag: "EM 002", serial: "28200002", number: "01811/26", process: "EM 002", issueDate: "2026-02-10", expiryDate: "2027-02-10", lab: "LG METROLOGIA", labEmail: '', labPhone: '', notes: '', viewUrl: mkViewUrl('01811/26') },
    { id: 'ce_em003', type: 'equipamento', name: "CALIBRE ANEL CILINDRO GNV 3/4\" NGT - 14 FIOS", tag: "EM 003", serial: "28200001", number: "01814/26", process: "EM 003", issueDate: "2026-02-10", expiryDate: "2027-02-10", lab: "LG METROLOGIA", labEmail: '', labPhone: '', notes: '', viewUrl: mkViewUrl('01814/26') },
    { id: 'ce_em005', type: 'equipamento', name: "CALIBRE ANEL CILINDRO 28.8 x 14 DIN 477 25E", tag: "EM 005", serial: "EM 005", number: "01815/26", process: "EM 005", issueDate: "2026-02-10", expiryDate: "2027-02-10", lab: "LG METROLOGIA", labEmail: '', labPhone: '', notes: '', viewUrl: mkViewUrl('01815/26') },
    { id: 'ce_em006', type: 'equipamento', name: "CALIBRE TAMPÃO CILINDRO GNV 1.1/8\" - 12UNF 2B", tag: "EM 006", serial: "EM 006", number: "CCM62605/26", process: "EM 006", issueDate: "2026-01-23", expiryDate: "2027-01-23", lab: "CEIME", labEmail: '', labPhone: '', notes: '', viewUrl: mkViewUrl('CCM62605/26') },
    { id: 'ce_em007', type: 'equipamento', name: "CALIBRE ANEL CILINDRO GNV 1.1/8\" - 12UNF 2A", tag: "EM 007", serial: "EM 007", number: "CCM62516/26", process: "EM 007", issueDate: "2026-01-21", expiryDate: "2027-01-21", lab: "CEIME", labEmail: '', labPhone: '', notes: '', viewUrl: mkViewUrl('CCM62516/26') },
    { id: 'ce_em013', type: 'equipamento', name: "TORQUÍMETRO GEDORE (20-100 Nm)", tag: "EM 013", serial: "F210418", number: "CCM62604/26", process: "EM 013", issueDate: "2026-01-23", expiryDate: "2027-01-23", lab: "CEIME", labEmail: '', labPhone: '', notes: '', viewUrl: mkViewUrl('CCM62604/26') },
    { id: 'ce_em023', type: 'equipamento', name: "MANÔMETRO 400 BAR WIKA", tag: "EM 023", serial: "WO004908222024", number: "13242/24", process: "EM 023", issueDate: "2026-03-25", expiryDate: "2027-03-25", lab: "LG METROLOGIA", labEmail: '', labPhone: '', notes: '', viewUrl: mkViewUrl('13242/24') },
    { id: 'ce_em024', type: 'equipamento', name: "Medidor de Gases de Exaustão Veicular (modelo TM 132)", tag: "EM 024", serial: "EM 024", number: "16242054", process: "EM 024", issueDate: "2026-02-20", expiryDate: "2027-02-20", lab: "IPEM", labEmail: '', labPhone: '', notes: '', viewUrl: mkViewUrl('16242054') },
    { id: 'ce_em032', type: 'equipamento', name: "Torquímetro SATA 68 Nm a 300 Nm", tag: "EM 032", serial: "625030949", number: "CCM62603/26", process: "EM 032", issueDate: "2026-01-23", expiryDate: "2027-01-23", lab: "CEIME", labEmail: '', labPhone: '', notes: '', viewUrl: mkViewUrl('CCM62603/26') },
    { id: 'ce_em033', type: 'equipamento', name: "Torquímetro SATA 100 Nm a 550 Nm", tag: "EM 033", serial: "724070162", number: "CCM59926/25", process: "EM 033", issueDate: "2025-11-27", expiryDate: "2026-11-27", lab: "CEIME", labEmail: '', labPhone: '', notes: '', viewUrl: mkViewUrl('CCM59926/25') },
    { id: 'ce_em034', type: 'equipamento', name: "CALIBRE TAMPÃO CILINDRO GNV 1.1/8\" - 12UNF 2B", tag: "EM 034", serial: "EM034", number: "01813/26", process: "EM 034", issueDate: "2026-02-10", expiryDate: "2027-02-10", lab: "", labEmail: '', labPhone: '', notes: '', viewUrl: mkViewUrl('01813/26') },
    { id: 'ce_em035', type: 'equipamento', name: "CALIBRE ANEL CILINDRO GNV 1.1/8\" - 12UNF 2A", tag: "EM 035", serial: "EM035", number: "01878/26", process: "EM 035", issueDate: "2026-02-11", expiryDate: "2027-02-11", lab: "", labEmail: '', labPhone: '', notes: '', viewUrl: mkViewUrl('01878/26') },
    { id: 'ce_em036', type: 'equipamento', name: "CALIBRE ANEL CILINDRO GNV 1.1/8\" - 12UNF 2A", tag: "EM 036", serial: "EM036", number: "01879/26", process: "EM 036", issueDate: "2026-02-11", expiryDate: "2027-02-11", lab: "", labEmail: '', labPhone: '', notes: '', viewUrl: mkViewUrl('01879/26') },
    { id: 'ce_em037', type: 'equipamento', name: "CALIBRE DE FOLGA 0,05MM - 1,00MM", tag: "EM 037", serial: "EM037", number: "01700/26", process: "EM 037", issueDate: "2026-02-09", expiryDate: "2027-02-09", lab: "", labEmail: '', labPhone: '', notes: '', viewUrl: mkViewUrl('01700/26') },
    { id: 'ce_em038', type: 'equipamento', name: "CALIBRE DE FOLGA 0,05MM - 1,00MM", tag: "EM 038", serial: "EM038", number: "01706/26", process: "EM 038", issueDate: "2026-02-09", expiryDate: "2027-02-09", lab: "", labEmail: '', labPhone: '', notes: '', viewUrl: mkViewUrl('01706/26') },
    // --- Calibrados SEM número de certificado (sem PDF) ---
    { id: 'ce_em021', type: 'equipamento', name: "TORQUÍMETRO MTX 70-350 NM", tag: "EM 021", serial: "141629", number: "", process: "EM 021", issueDate: "2025-12-01", expiryDate: "2026-12-01", lab: "CEIME", labEmail: '', labPhone: '', notes: '' },
    { id: 'ce_em031', type: 'equipamento', name: "Torquímetro Gedore (60-300Nm)", tag: "EM 031", serial: "EM031", number: "", process: "EM 031", issueDate: "2025-12-01", expiryDate: "2026-12-01", lab: "CEIME", labEmail: '', labPhone: '', notes: '' },
    { id: 'ce_em039', type: 'equipamento', name: "MANÔMETRO 400 BAR WIKA", tag: "EM 039", serial: "EM039", number: "", process: "EM 039", issueDate: "2026-03-25", expiryDate: "2027-03-25", lab: "LG METROLOGIA", labEmail: '', labPhone: '', notes: '' },
    { id: 'ce_em040', type: 'equipamento', name: "MANÔMETRO 400 BAR WIKA", tag: "EM 040", serial: "EM040", number: "", process: "EM 040", issueDate: "2026-03-25", expiryDate: "2027-03-25", lab: "LG METROLOGIA", labEmail: '', labPhone: '', notes: '' },
    // --- Calibrados (planilha) com PDF localizado pelo número do certificado (cert. /25, datas da planilha) ---
    { id: 'ce_em010', type: 'equipamento', name: "TORQUÍMETRO (60-300Nm) (2016)", tag: "EM 010", serial: "A115 240", number: "CCM57533/25", process: "EM 010", issueDate: "2026-10-28", expiryDate: "2027-10-28", lab: "CEIME", labEmail: '', labPhone: '', notes: '', viewUrl: mkViewUrl('CCM57533/25') },
    { id: 'ce_em016', type: 'equipamento', name: "TORQUÍMETRO AXIAL (1,5 a 6,5 Nm) King Tony", tag: "EM 016", serial: "2106110067", number: "9105/25", process: "EM 016", issueDate: "2026-10-28", expiryDate: "2027-10-28", lab: "LG METROLOGIA", labEmail: '', labPhone: '', notes: '', viewUrl: mkViewUrl('9105/25') },
    { id: 'ce_em017', type: 'equipamento', name: "PAQUÍMETRO 150mm DIGIMESS", tag: "EM 017", serial: "21052297", number: "5572/25", process: "EM 017", issueDate: "2026-10-28", expiryDate: "2027-10-28", lab: "LG METROLOGIA", labEmail: '', labPhone: '', notes: '', viewUrl: mkViewUrl('5572/25') },
    { id: 'ce_em019', type: 'equipamento', name: "CALIBRE ANEL M30x2-6G NOGO", tag: "EM 019", serial: "EM 019", number: "CCM56911/25", process: "EM 019", issueDate: "2026-10-28", expiryDate: "2027-10-28", lab: "CEIME", labEmail: '', labPhone: '', notes: '', viewUrl: mkViewUrl('CCM56911/25') },
    { id: 'ce_em025', type: 'equipamento', name: "TORQUÍMETRO 70-350 NM", tag: "EM 025", serial: "EM025", number: "CCM55866/25", process: "EM 025", issueDate: "2026-10-28", expiryDate: "2027-10-28", lab: "CEIME", labEmail: '', labPhone: '', notes: '', viewUrl: mkViewUrl('CCM55866/25') },
    // EM 029: planilha indica CCM57661/25, mas o arquivo "EM 029" contém CCM57660/25 (57661 é da EM 030). Corrigido.
    { id: 'ce_em029', type: 'equipamento', name: "Trena 5 metros Starret", tag: "EM 029", serial: "EM029", number: "CCM57660/25", process: "EM 029", issueDate: "2026-10-28", expiryDate: "2027-10-28", lab: "CEIME", labEmail: '', labPhone: '', notes: 'Certificado nº CCM57660/25 (a planilha indica 57661/25 — divergência; 57661 é o arquivo da EM 030).', viewUrl: mkViewUrl('CCM57660/25') },
  ];

  const SEED = {
    settings: { theme: 'dark', density: 'comfortable', accent: 'cyan', prodDashboardUrl: 'https://convergasapp.com.br/tv', guidelineUrl: 'https://convergas-brand-guideline.vercel.app', mntTargets: { disp: 95, mttr: 4, prev: 90 } },

    // QUALIDADE — registro de certificados (CATA + instrumentos calibrados)
    certificates: CATA_CERTS,

    // QUALIDADE — laboratórios parceiros (cadastro único; certificados vinculam pelo nome)
    labs: [
      { id: 'lab_cata', name: 'CATA Certificações (INMETRO)', email: '', phone: '', site: '', notes: 'Organismo de certificação de produtos (CATA/INMETRO).' },
      { id: 'lab_lg', name: 'LG METROLOGIA', email: '', phone: '', site: '', notes: 'Calibração de instrumentos de medição.' },
      { id: 'lab_ceime', name: 'CEIME', email: '', phone: '', site: '', notes: 'Calibração de instrumentos de medição.' },
      { id: 'lab_ipem', name: 'IPEM', email: '', phone: '', site: '', notes: 'Instituto de Pesos e Medidas.' },
    ],

    // QUALIDADE — EPI: catálogo (nomes), entregas e fichas por colaborador
    epis: [],
    epiEntregas: [],
    epiFichas: [],

    // roster real Convergas (planilha COMPUTADORES.xlsx / contas Office 365)
    team: [
      { id: 'u_leo', name: 'Leonardo', email: 'leonardo@convergas.com.br', sector: 'TI', machineId: 'PC05', vpn: true, engServer: true },
      { id: 'u_pedro', name: 'Pedro (TI)', email: 'pedro@convergas.com.br', sector: 'TI', machineId: 'PC30', vpn: true, engServer: true },
      { id: 'u_albino', name: 'Albino', email: 'albino@convergas.com.br', sector: 'Engenharia', machineId: 'PC21', vpn: true, engServer: true },
      { id: 'u_luis', name: 'Luis', email: 'luis@convergas.com.br', sector: 'Engenharia', machineId: 'PC17', vpn: false, engServer: true },
      { id: 'u_jonas', name: 'Jonas Oliveira Lima', email: 'jonas@convergas.com.br', sector: 'Engenharia', machineId: 'PC29', vpn: false, engServer: true },
      { id: 'u_rafael', name: 'Rafael', email: 'rafael@convergas.com.br', sector: 'Engenharia', machineId: 'PC28', vpn: false, engServer: true },
      { id: 'u_andre', name: 'Andre Bermudo', email: 'andre@convergas.com.br', sector: 'Comercial / Diretoria', machineId: 'PC20', vpn: true, engServer: false },
      { id: 'u_gaetano', name: 'Gaetano', email: 'comercial@convergas.com.br', sector: 'Produção', machineId: 'PC07', vpn: false, engServer: false },
      { id: 'u_janifer', name: 'Janifer', email: 'adminstrativo@convergas.com.br', sector: 'Administrativo', machineId: 'PC08', vpn: false, engServer: false },
      { id: 'u_alex', name: 'Alex', email: 'logistica@convergas.com.br', sector: 'Logística', machineId: 'PC09', vpn: false, engServer: false },
      { id: 'u_anderson', name: 'Anderson', email: 'manutencao@convergas.com.br', sector: 'Manutenção', machineId: 'PC19', vpn: false, engServer: false },
      { id: 'u_lincoln', name: 'Lincoln Ribeiro Zamai', email: 'zamai@convergas.com.br', sector: 'Pós-venda', machineId: 'PC22', vpn: false, engServer: false },
      { id: 'u_ricardo', name: 'Ricardo Elias', email: 'almoxarifado@convergas.com.br', sector: 'Almoxarifado', machineId: 'PC23', vpn: false, engServer: false },
      { id: 'u_joao', name: 'João Guilherme Lima', email: 'joao@convergas.com.br', sector: 'Compras / PCP', machineId: 'PC24', vpn: false, engServer: false },
      { id: 'u_matheus', name: 'Matheus Henrique', email: 'monteiro@convergas.com.br', sector: 'Qualidade', machineId: 'PC25', vpn: false, engServer: false },
      { id: 'u_alexandre', name: 'Alexandre Santos', email: 'alexandre@convergas.com.br', sector: 'Compras', machineId: 'PC26', vpn: false, engServer: false },
      { id: 'u_josias', name: 'Josias', email: '', sector: 'Qualidade', machineId: 'PC27', vpn: false, engServer: false },
    ],

    // fleet real PC00–PC30 (service tags, contas Office e antivírus da planilha de controle)
    computers: [
      { id: 'PC00', hostname: 'PC00', userId: '', type: 'desktop', status: 'ativo', admin: true, serial: '—', office: '—', antivirus: 'Kaspersky', notes: 'Servidor. Credenciais: ver Cofre.' },
      { id: 'PC01', hostname: 'PC01', userId: 'u_albino', type: 'desktop', status: 'ativo', admin: false, serial: 'DW5L0T3', office: 'albino@convergas.com.br', antivirus: 'MacAfee', notes: 'Engenharia (Albino) — Dell Precision 3660 Tower.' },
      { id: 'PC03', hostname: 'PC03', userId: '', type: 'notebook', status: 'manutencao', admin: false, serial: 'J85V3Q3', office: 'tiproducao@convergas.com.br', antivirus: 'Kaspersky', notes: 'Display planejamento produção — substituir bateria. Dell Vostro 15 5510.' },
      { id: 'PC05', hostname: 'PC05', userId: 'u_leo', type: 'notebook', status: 'ativo', admin: true, serial: '3Z2JKY3', office: 'leonardo@convergas.com.br', antivirus: 'Kaspersky Plus', notes: 'Leonardo — Dell Latitude 3520.' },
      { id: 'PC06', hostname: 'PC06', userId: '', type: 'notebook', status: 'inativo', admin: false, serial: '3T5Z1Z3', office: 'bermudo@convergas.com.br', antivirus: 'Kaspersky', notes: 'Antonio Bermudo (REMOVER?). Dell Latitude 3520.' },
      { id: 'PC07', hostname: 'PC07', userId: 'u_gaetano', type: 'notebook', status: 'ativo', admin: false, serial: '195V3Q3', office: 'comercial@convergas.com.br', antivirus: 'Kaspersky', notes: 'Gaetano (Produção) — Dell Vostro 15 5510.' },
      { id: 'PC08', hostname: 'PC08', userId: 'u_janifer', type: 'notebook', status: 'ativo', admin: false, serial: '?', office: 'adminstrativo@convergas.com.br', antivirus: 'Kaspersky', notes: 'Janifer — Legion Lenovo Y530 81GT.' },
      { id: 'PC09', hostname: 'PC09', userId: 'u_alex', type: 'notebook', status: 'ativo', admin: false, serial: 'PEO3VBAN', office: 'logistica@convergas.com.br', antivirus: 'Kaspersky', notes: 'Alex (Logística) — Legion Lenovo Y530 81GT.' },
      { id: 'PC10', hostname: 'PC10', userId: '', type: 'notebook', status: 'inativo', admin: false, serial: 'JFG2XG3', office: '', antivirus: 'Instalar Kaspersky', notes: 'A definir — Dell Vostro 3501.' },
      { id: 'PC11', hostname: 'PC11', userId: '', type: 'notebook', status: 'ativo', admin: false, serial: '4KYSVG2', office: 'anderson@convergas.com.br', antivirus: 'Kaspersky', notes: 'Manutenção 2 (sem usuário fixo) — Dell Inspiron 5457.' },
      { id: 'PC12', hostname: 'PC12', userId: '', type: 'notebook', status: 'manutencao', admin: false, serial: '4KYKVG2', office: 'rafael@convergas.com.br', antivirus: 'Kaspersky', notes: 'Manutenção de tela. Dell Inspiron 5457.' },
      { id: 'PC14', hostname: 'PC14', userId: '', type: 'notebook', status: 'ativo', admin: false, serial: '4KYQVG2', office: 'alex.ramos@convergas.com.br', antivirus: 'Kaspersky', notes: 'Almoxarifado (Flavio) — Dell Inspiron 5457.' },
      { id: 'PC16', hostname: 'PC16', userId: '', type: 'desktop', status: 'inativo', admin: false, serial: 'BRG302F8D8', office: 'daniel.souza@convergas.com.br', antivirus: '—', notes: 'COM DEFEITO — descartar. HP Compaq Elite 8300.' },
      { id: 'PC17', hostname: 'PC17', userId: 'u_luis', type: 'notebook', status: 'ativo', admin: false, serial: 'PE0CCWWJ', office: 'luis@convergas.com.br', antivirus: 'Verificar', notes: 'Luis (Engenharia) — Lenovo ThinkPad T14 Gen 4.' },
      { id: 'PC19', hostname: 'PC19', userId: 'u_anderson', type: 'notebook', status: 'ativo', admin: false, serial: 'PEO6PQF8', office: 'manutencao@convergas.com.br', antivirus: 'Kaspersky', notes: 'Anderson (Manutenção) — Lenovo ThinkPad L13.' },
      { id: 'PC20', hostname: 'PC20', userId: 'u_andre', type: 'notebook', status: 'ativo', admin: false, serial: 'PEDCSS34', office: 'andre@convergas.com.br', antivirus: 'Kaspersky', notes: 'Andre Bermudo — Lenovo ThinkPad T14 Gen 4.' },
      { id: 'PC21', hostname: 'PC21', userId: 'u_albino', type: 'notebook', status: 'ativo', admin: false, serial: 'PEDD18NG', office: 'albino@convergas.com.br', antivirus: 'Kaspersky', notes: 'Votorantini/Albino (Engenharia) — Lenovo ThinkPad P16v G2.' },
      { id: 'PC22', hostname: 'PC22', userId: 'u_lincoln', type: 'notebook', status: 'ativo', admin: false, serial: 'PE0ECQQ2', office: 'zamai@convergas.com.br', antivirus: 'Kaspersky', notes: 'Lincoln Zamai (Pós-venda) — Lenovo IdeaPad 1 15AMN7.' },
      { id: 'PC23', hostname: 'PC23', userId: 'u_ricardo', type: 'notebook', status: 'ativo', admin: false, serial: 'PE0EE6QE', office: 'almoxarifado@convergas.com.br', antivirus: 'Kaspersky', notes: 'Ricardo Elias (Almoxarifado) — Lenovo IdeaPad 1 15AMN7.' },
      { id: 'PC24', hostname: 'PC24', userId: 'u_joao', type: 'notebook', status: 'ativo', admin: false, serial: 'PE0EQE48', office: 'joao@convergas.com.br', antivirus: 'Verificar', notes: 'João Guilherme (Compras/PCP) — Lenovo Slim 3 15IRH10.' },
      { id: 'PC25', hostname: 'PC25', userId: 'u_matheus', type: 'notebook', status: 'ativo', admin: false, serial: 'PE0FAE2C', office: 'monteiro@convergas.com.br', antivirus: 'Kaspersky', notes: 'Matheus Henrique (Qualidade) — Lenovo Slim 3 15IRH10.' },
      { id: 'PC26', hostname: 'PC26', userId: 'u_alexandre', type: 'notebook', status: 'ativo', admin: false, serial: 'PE0FAE2H', office: 'alexandre@convergas.com.br', antivirus: 'Kaspersky', notes: 'Alexandre Santos (Compras) — Lenovo Slim 3 15IRH10.' },
      { id: 'PC27', hostname: 'PC27', userId: 'u_josias', type: 'notebook', status: 'ativo', admin: false, serial: 'PE0G0SBD', office: '', antivirus: 'Verificar', notes: 'Josias (Qualidade) — Lenovo DVC43RH2.' },
      { id: 'PC28', hostname: 'PC28', userId: 'u_rafael', type: 'notebook', status: 'ativo', admin: false, serial: 'PE0G03FH', office: '', antivirus: 'Verificar', notes: 'Rafael (Engenharia) — Lenovo LOQ 15IAX9E.' },
      { id: 'PC29', hostname: 'PC29', userId: 'u_jonas', type: 'notebook', status: 'ativo', admin: false, serial: 'PE0G03CK', office: 'jonas@convergas.com.br', antivirus: 'Instalar Kaspersky', notes: 'Jonas (Engenharia) — Lenovo LOQ. Acesso visualização ao servidor.' },
      { id: 'PC30', hostname: 'PC30', userId: 'u_pedro', type: 'notebook', status: 'ativo', admin: true, serial: '—', office: 'pedro@convergas.com.br', antivirus: 'Kaspersky', notes: 'Pedro (TI).' },
    ],

    printers: REAL_PRINTERS,

    commands: RICH_COMMANDS,

    runbooks: [
      { id: 'rb1', title: 'Setup de novo computador', desc: 'Procedimento padrão de preparação de uma máquina nova antes da entrega.', steps: ['Atualizar Windows totalmente (Windows Update).', 'Renomear hostname seguindo padrão CVG-SETOR-NNN.', 'Instalar Microsoft 365 e ativar com a conta corporativa.', 'Configurar impressora do setor (ver runbook Instalar impressora).', 'Instalar antivírus corporativo e validar atualização.', 'Criar usuário local e definir permissões de admin conforme política.', 'Cadastrar a máquina no módulo Computadores do Ops Center.'], related: ['cm1', 'cm3'] },
      { id: 'rb2', title: 'Configurar usuário novo', desc: 'Onboarding de TI para um novo colaborador.', steps: ['Criar conta Office 365 no padrão nome.sobrenome@convergas.com.br.', 'Definir senha temporária e exigir troca no primeiro acesso.', 'Adicionar aos grupos de distribuição do setor.', 'Configurar acesso VPN se aplicável.', 'Liberar acesso ao servidor de engenharia se aplicável.', 'Atribuir máquina e periféricos no módulo Equipe.'], related: [] },
      { id: 'rb3', title: 'Instalar impressora de rede', desc: 'Adicionar uma impressora compartilhada por IP.', steps: ['Confirmar o IP da impressora no módulo Impressoras.', 'Baixar o driver pelo botão "Abrir Driver".', 'Painel de Controle > Dispositivos > Adicionar impressora > Adicionar por TCP/IP.', 'Inserir o IP e concluir a instalação com o driver baixado.', 'Imprimir página de teste.'], related: ['cm8'] },
      { id: 'rb4', title: 'Reset de rede completo', desc: 'Quando a máquina perde conexão sem causa aparente.', steps: ['Executar limpeza de DNS.', 'Executar reset do Winsock.', 'Liberar e renovar o IP.', 'Reiniciar o computador.', 'Validar conectividade com ping.'], related: ['cm2', 'cm4', 'cm10', 'cm8'] },
    ],

    infra: {
      domains: [
        { id: 'd1', domain: 'convergas.com.br', provider: 'Locaweb', ip: '189.126.0.0', status: 'ativo', adminUrl: 'https://painel.locaweb.com.br/' },
        { id: 'd2', domain: 'site.convergas.com.br', provider: 'Vercel', ip: '76.76.21.21', status: 'ativo', adminUrl: 'https://vercel.com/dashboard' },
      ],
      dns: [
        { id: 'dn1', type: 'A', name: '@', value: '216.198.79.1' },
        { id: 'dn2', type: 'CNAME', name: 'www', value: 'c748F9766727F37a.vercel-dns-017.com' },
      ],
    },

    // T.I — controle de domínios web (editável) + registros DNS. Os 3 domínios da Convergas.
    webDomains: [
      { id: 'dom_convergas', domain: 'convergas.com.br', provider: 'Locaweb', ip: '189.126.0.0', status: 'ativo', adminUrl: 'https://painel.locaweb.com.br/', notes: '' },
      { id: 'dom_app', domain: 'convergasapp.com.br', provider: 'Registro.br', ip: '199.36.158.100', status: 'ativo', adminUrl: 'https://registro.br/', notes: '' },
      { id: 'dom_homologa', domain: 'convergashomologa.com.br', provider: 'Registro.br', ip: '216.198.79.65', status: 'ativo', adminUrl: 'https://registro.br/', notes: '' },
    ],
    dnsRecords: [
      { id: 'dns_a', type: 'A', name: '@', value: '216.198.79.1' },
      { id: 'dns_www', type: 'CNAME', name: 'www', value: 'c748F9766727F37a.vercel-dns-017.com' },
    ],

    inventory: [
      { id: 'iv1', type: 'Mouse', brandModel: 'Logitech M170', qty: 8, status: 'em_uso', assignments: ['u_leo'] },
      { id: 'iv2', type: 'Teclado', brandModel: 'Multilaser TC193', qty: 6, status: 'disponivel', assignments: [] },
      { id: 'iv3', type: 'Monitor', brandModel: 'LG 24" 24MK430', qty: 3, status: 'em_uso', assignments: ['u_albino'] },
      { id: 'iv4', type: 'Headset', brandModel: 'HyperX Cloud Stinger', qty: 2, status: 'reserva', assignments: [] },
      { id: 'iv5', type: 'Monitor', brandModel: 'Dell P2419H', qty: 1, status: 'em_uso', assignments: ['u_luis'] },
    ],

    // SOFTWARE — licenças e assinaturas (vazio: cadastrar manualmente quando o controle estiver validado)
    licenses: [],

    // MANUTENÇÃO — equipamentos/ativos e ordens de serviço (começam vazios)
    equipments: [],
    serviceOrders: [],

    // MANUTENÇÃO — trilha de auditoria (histórico automático de alterações)
    history: [],

    // MANUTENÇÃO — estoque de peças de reposição
    parts: [],

    // T.I — portais SharePoint por setor
    sharepoint: [
      { id: 'sp_admin', name: 'Administrativo', url: 'https://convergasfs.sharepoint.com/sites/Administrativo2', notes: '' },
      { id: 'sp_almox', name: 'Almoxarifado', url: 'https://convergasfs.sharepoint.com/sites/Almoxarifado', notes: '' },
      { id: 'sp_comercial', name: 'Comercial', url: 'https://convergasfs.sharepoint.com/sites/Comercial', notes: '' },
      { id: 'sp_compras', name: 'Compras e Logística', url: 'https://convergasfs.sharepoint.com/sites/CompraseLog', notes: '' },
      { id: 'sp_financeiro', name: 'Financeiro', url: 'https://convergasfs.sharepoint.com/sites/Financeiro', notes: '' },
      { id: 'sp_fiscal', name: 'Fiscal', url: 'https://convergasfs.sharepoint.com/sites/Fiscal', notes: '' },
      { id: 'sp_qualidade', name: 'Gestão de Qualidade', url: 'https://convergasfs.sharepoint.com/sites/Qualidade', notes: '' },
      { id: 'sp_juridico', name: 'Jurídico', url: 'https://convergasfs.sharepoint.com/sites/Juridico', notes: '' },
      { id: 'sp_marketing', name: 'Marketing', url: 'https://convergasfs.sharepoint.com/sites/Marketing', notes: '' },
      { id: 'sp_producao', name: 'Produção', url: 'https://convergasfs.sharepoint.com/sites/producao', notes: '' },
      { id: 'sp_rh', name: 'RH', url: 'https://convergasfs.sharepoint.com/sites/rh', notes: '' },
      { id: 'sp_servicos', name: 'Serviços', url: 'https://convergasfs.sharepoint.com/sites/Servicos', notes: '' },
      { id: 'sp_ti', name: 'TI', url: 'https://convergasfs.sharepoint.com/sites/TI', notes: '' },
      { id: 'sp_engenharia', name: 'Engenharia', url: 'https://convergasfs.sharepoint.com/sites/Engenharia', notes: '' },
    ],

    // TELEFONIA — linhas móveis (Lista telefones moveis 04/2025) + PABX
    phones: [
      { id: 'ph1', user: 'Anderson', sector: 'Assistência Técnica', number: '19 99909-3734', plan: '8 GB', value: 73.93, model: 'LG K61', owner: 'Convergas', pin: '', notes: '' },
      { id: 'ph2', user: 'Lincoln Ribeiro Zamai', sector: 'Comercial', number: '19 97111-9827', plan: '3 GB', value: 47.99, model: 'Motorola Moto G04', owner: 'Convergas', pin: '2202', notes: '' },
      { id: 'ph3', user: 'Braulio', sector: 'Compras', number: '19 99952-9179', plan: '3 GB', value: 47.99, model: 'Motorola', owner: 'Convergas', pin: '', notes: 'Desbloqueio: desenhar um L.' },
      { id: 'ph4', user: 'Andre', sector: 'Comercial', number: '19 98175-1488', plan: '20 GB', value: 74.99, model: 'iPhone', owner: 'Próprio', pin: '', notes: '' },
      { id: 'ph5', user: 'Antonio Bermudo', sector: 'Diretoria', number: '19 99833-5357', plan: '3 GB', value: 58.11, model: 'iPhone (próprio)', owner: 'Próprio', pin: '', notes: 'Cancelado?' },
      { id: 'ph6', user: 'Alex', sector: 'Logística', number: '19 99831-3980', plan: '3 GB', value: 47.99, model: 'LG K61', owner: 'Convergas', pin: '', notes: 'Desbloqueio: desenhar um L.' },
      { id: 'ph7', user: 'Luis', sector: 'Engenharia', number: '19 97101-0848', plan: '6 GB', value: 32.00, model: 'Motorola Moto G04', owner: 'Convergas', pin: '1135', notes: '' },
      { id: 'ph8', user: 'Tony', sector: '—', number: '19 99758-3132', plan: '20 GB', value: 74.99, model: 'iPhone', owner: 'Próprio', pin: '', notes: '' },
      { id: 'ph9', user: 'Chip dados (modem)', sector: 'Assistência Técnica', number: '19 99983-0857', plan: '100 GB', value: 99.90, model: 'Modem ZTE', owner: 'Convergas', pin: '', notes: 'Somente dados. Modem fica na gaveta do Leonardo.' },
    ],

    // COFRE — credenciais sensíveis (WiFi / Conta Admin / E-mail). Segredos em branco; preencher localmente.
    vault: [
      { id: 'vt1', category: 'WiFi', label: 'Modem ZTE (dados móveis)', identifier: 'Modem ZTE Convergas', secret: 'convergas', notes: 'Modem 4G da assistência técnica.' },
      { id: 'vt2', category: 'WiFi', label: 'Wi-Fi Convergas', identifier: 'SSID Convergas', secret: '', notes: 'Ver planilha SENHAS WIFI.pptx.' },
      { id: 'vt3', category: 'Conta Admin', label: 'Admin padrão das máquinas', identifier: 'leonardo@convergas.com.br', secret: '', notes: 'PIN admin padrão — preencher localmente.' },
    ],
  };

  // categorias que saíram do Cofre (viraram abas próprias)
  const VAULT_REMOVED = ['Servidor', 'BitLocker', 'Outro'];

  // ensure schema integrity across versions
  function migrate(d) {
    if (!d) return d;
    if (Array.isArray(d.inventory)) {
      d.inventory.forEach((i) => {
        if (!Array.isArray(i.assignments)) i.assignments = i.assignedTo ? [i.assignedTo] : [];
        delete i.assignedTo;
        i.qty = Number(i.qty) || 0;
      });
    }
    // new collections (forward-compat)
    if (!Array.isArray(d.licenses)) d.licenses = [];
    if (!Array.isArray(d.phones)) d.phones = [];
    if (!Array.isArray(d.vault)) d.vault = [];
    if (!Array.isArray(d.certificates)) d.certificates = [];
    if (!Array.isArray(d.labs)) d.labs = [];
    if (!Array.isArray(d.epis)) d.epis = [];
    if (!Array.isArray(d.epiEntregas)) d.epiEntregas = [];
    if (!Array.isArray(d.epiFichas)) d.epiFichas = [];
    if (!Array.isArray(d.equipments)) d.equipments = [];
    if (!Array.isArray(d.serviceOrders)) d.serviceOrders = [];
    // one-time: merge de Ocorrências — a abertura agora é direto Ordem de Serviço.
    // Ocorrências pendentes (que nunca viraram OS) passam a ser a própria OS, preservando foto/descrição.
    // As que já geraram OS ficam como carregadoras invisíveis (a OS aponta p/ elas via occurrenceId).
    if (!d._mntMergeOc) {
      d.serviceOrders.forEach((o) => {
        if (o.kind === 'ocorrencia' && !o.osId) {
          o.kind = 'os';
          if (!o.osType) o.osType = 'corretiva';
          o.status = (o.status === 'finalizada') ? 'finalizada' : (o.status === 'em_execucao' || o.status === 'ordem_gerada') ? 'andamento' : 'pendente';
        }
      });
      d._mntMergeOc = true;
    }
    if (!Array.isArray(d.history)) d.history = [];
    if (!Array.isArray(d.parts)) d.parts = [];
    if (d.settings && !d.settings.mntTargets) d.settings.mntTargets = { disp: 95, mttr: 4, prev: 90 };
    if (!Array.isArray(d.sharepoint)) d.sharepoint = [];
    if (!Array.isArray(d.webDomains)) d.webDomains = [];
    if (!Array.isArray(d.dnsRecords)) d.dnsRecords = [];
    // PROGRAMAÇÃO (PCP/Gestão) — coleções novas (ficam locais; entram no Supabase numa fase seguinte)
    if (!Array.isArray(d.progSetores)) d.progSetores = [];
    if (!Array.isArray(d.progPessoas)) d.progPessoas = [];
    if (!Array.isArray(d.progAtividades)) d.progAtividades = [];
    if (!Array.isArray(d.progRNC)) d.progRNC = [];
    if (!Array.isArray(d.progFamilias)) d.progFamilias = [];
    if (!Array.isArray(d.progFornecedores)) d.progFornecedores = [];
    if (!Array.isArray(d.progEstoque)) d.progEstoque = [];
    if (!Array.isArray(d.progPedidos)) d.progPedidos = [];
    if (!Array.isArray(d.progConfig)) d.progConfig = [];
    if (!d._progSeed) {
      if (!d.progSetores.length) {
        d.progSetores = [
          { id: 'set_eng', nome: 'Engenharia' }, { id: 'set_qua', nome: 'Qualidade' },
          { id: 'set_ti', nome: 'TI' }, { id: 'set_prod', nome: 'Produção' }, { id: 'set_comp', nome: 'Compras' },
        ];
      }
      d._progSeed = true;
    }
    // Fase 2 — catálogo de exemplo (motor de viabilidade). Apagável. Estoque manual AGORA;
    // vira fonte OMIE na Fase 3 (mesma coleção progEstoque).
    if (!d._progSeed2) {
      if (!d.progFamilias.length) d.progFamilias = [
        { id: 'fam_inst', nome: 'Instalação dual-fuel caminhão', baselineDias: 3, pessoasNecessarias: 2 },
        { id: 'fam_mnt', nome: 'Manutenção / revisão', baselineDias: 1, pessoasNecessarias: 1 },
        { id: 'fam_diag', nome: 'Diagnóstico', baselineDias: 1, pessoasNecessarias: 1 },
      ];
      if (!d.progFornecedores.length) d.progFornecedores = [
        { id: 'for_cil', nome: 'Cilindros Brasil', contato: '(19) 3000-0001', leadTimeDias: 7 },
        { id: 'for_vlv', nome: 'Válvulas & Conexões SP', contato: '(11) 4000-0002', leadTimeDias: 10 },
      ];
      if (!d.progEstoque.length) d.progEstoque = [
        { pn: 'CIL-120', descricao: 'Cilindro GNV 120L', quantidade: 40 },
        { pn: 'VLV-REG', descricao: 'Válvula reguladora', quantidade: 120 },
        { pn: 'KIT-ELE', descricao: 'Kit elétrico dual-fuel', quantidade: 60 },
        { pn: 'PARAF-M10', descricao: 'Parafuso M10 (kit fixação)', quantidade: 600 },
      ];
      if (!d.progConfig.length) d.progConfig = [{ id: 'cfg', leadTimeReposicaoPadrao: 7 }];
      d._progSeed2 = true;
    }
    if (d.settings) {
      if (d.settings.prodDashboardUrl == null) d.settings.prodDashboardUrl = '';
      if (d.settings.guidelineUrl == null) d.settings.guidelineUrl = 'https://convergas-brand-guideline.vercel.app';
      // dados da empresa p/ o timbre dos documentos (Ordem de Serviço). CNPJ em branco até o admin preencher.
      if (!d.settings.company) d.settings.company = {
        name: 'Convergas Fuel Systems',
        legal: 'Convergas Equipamentos e Serviços Ltda',
        cnpj: '68.347.343/0001-60',
        address: 'Rua Alfredo Achcar, 1135 — Nova Vinhedo',
        city: 'Vinhedo', uf: 'SP', cep: '13284-072',
        phone: '(19) 3876-4363', email: 'atendimento@convergas.com.br', site: 'www.convergas.com.br',
      };
      // one-time: gravar o CNPJ oficial mesmo p/ quem já tinha o app instalado (company sem CNPJ)
      if (!d._cnpjSet) { if (d.settings.company && !d.settings.company.cnpj) d.settings.company.cnpj = '68.347.343/0001-60'; d._cnpjSet = true; }
    }
    // one-time: importar certificados CATA iniciais (controle de qualidade)
    if (!d._cataSeed) { (d.certificates = d.certificates || []); if (!d.certificates.some((c) => c.type === 'cata')) d.certificates.push(...JSON.parse(JSON.stringify(CATA_CERTS))); d._cataSeed = true; }
    // one-time: importar calibração de equipamentos de medição + remover o tipo antigo "instrumento"
    if (!d._equipSeed) {
      d.certificates = (d.certificates || []).filter((c) => c.type !== 'instrumento');
      if (!d.certificates.some((c) => c.type === 'equipamento')) d.certificates.push(...JSON.parse(JSON.stringify(EQUIP_CERTS)));
      d._equipSeed = true;
    }
    // one-time (out/2026): recarregar a calibração de equipamentos a partir da planilha-mestre
    // (só Calibrados; vencidos removidos). Substitui por inteiro os certs de equipamento locais.
    // Para quem usa a nuvem, a nuvem (atualizada via scripts/atualizar-equip-2026.mjs) vence no sync.
    if (!d._equipSeed2026q4) {
      d.certificates = (d.certificates || []).filter((c) => c.type !== 'equipamento' && c.type !== 'instrumento');
      d.certificates.push(...JSON.parse(JSON.stringify(EQUIP_CERTS)));
      d._equipSeed2026q4 = true;
    }
    // one-time: incluir certificados CATA/INMETRO que faltavam (Válvula NBR 24041162 e Cilindros P2024-04A)
    if (!d._cataSeed2) {
      d.certificates = d.certificates || [];
      CATA_CERTS.filter((c) => ['24041162', 'P2024-04A'].includes(c.number))
        .forEach((c) => { if (!d.certificates.some((x) => x.number === c.number)) d.certificates.push(JSON.parse(JSON.stringify(c))); });
      d._cataSeed2 = true;
    }
    // one-time: manter também a certificação ANTERIOR do Suporte de 4 cilindros (2208843), a pedido
    if (!d._cataSeed3) {
      d.certificates = d.certificates || [];
      CATA_CERTS.filter((c) => c.number === '2208843')
        .forEach((c) => { if (!d.certificates.some((x) => x.number === c.number)) d.certificates.push(JSON.parse(JSON.stringify(c))); });
      d._cataSeed3 = true;
    }
    // one-time: sincronizar com a pasta "CERT VALIDOS" — adiciona os certificados que faltavam
    // (Válvula do cilindro Rodagás 24081373 e Cilindro de alta pressão Anhui 26071866)
    // e padroniza o nome exibindo o FABRICANTE, conforme o campo oficial de cada PDF.
    if (!d._cataSeed4) {
      d.certificates = d.certificates || [];
      CATA_CERTS.filter((c) => ['24081373', '26071866'].includes(c.number))
        .forEach((c) => { if (!d.certificates.some((x) => x.number === c.number)) d.certificates.push(JSON.parse(JSON.stringify(c))); });
      const bySeedNum = {}; CATA_CERTS.forEach((c) => { bySeedNum[c.number] = c; });
      d.certificates.filter((c) => c.type === 'cata').forEach((c) => {
        const seed = bySeedNum[c.number];
        if (seed && seed.name && c.name !== seed.name) c.name = seed.name;
      });
      d._cataSeed4 = true;
    }
    // one-time: anexar os PDFs como arquivos ESTÁTICOS do site (assets/certs/{numero}.pdf), para a
    // visualização funcionar sempre — independente de backend (a nuvem Supabase do app foi descontinuada).
    if (!d._cataSeed5) {
      const PDF_NUMS = ['23101152', '26091902', '24041163', '24041164', '25011480', '25011481', '24111457', '25081675', '25101702', '26011759', '25101701', '24041162', 'P2024-04A', '2208843', '24081371', '24031156', '24081373', '26071866'];
      (d.certificates || []).filter((c) => c.type === 'cata').forEach((c) => {
        if (PDF_NUMS.includes(c.number)) {
          c.viewUrl = 'assets/certs/' + c.number + '.pdf';
          if (!c.fileName) c.fileName = c.number + '.pdf';
        }
      });
      d._cataSeed5 = true;
    }
    // one-time (out/2026): sincronizar com a pasta CERT VALIDOS — adiciona os 2 certificados novos
    // (Redutor de pressão Rodagás 24081369 e Cilindro de alta pressão Gifel 26031810), com PDF estático.
    if (!d._cataSeed6) {
      d.certificates = d.certificates || [];
      CATA_CERTS.filter((c) => ['24081369', '26031810'].includes(c.number)).forEach((c) => {
        if (!d.certificates.some((x) => x.number === c.number)) {
          const nc = JSON.parse(JSON.stringify(c));
          nc.viewUrl = 'assets/certs/' + nc.number + '.pdf';
          nc.fileName = nc.number + '.pdf';
          d.certificates.push(nc);
        }
      });
      d._cataSeed6 = true;
    }
    // one-time: garantir laboratórios parceiros (seed + criados a partir dos certificados existentes)
    if (!d._labsSeed) {
      d.labs = Array.isArray(d.labs) ? d.labs : [];
      const findLab = (n) => d.labs.find((l) => (l.name || '').trim().toLowerCase() === (n || '').trim().toLowerCase());
      // garante os laboratórios conhecidos
      [['CATA Certificações (INMETRO)', 'lab_cata'], ['LG METROLOGIA', 'lab_lg'], ['CEIME', 'lab_ceime'], ['IPEM', 'lab_ipem']]
        .forEach(([nm, id]) => { if (!findLab(nm)) d.labs.push({ id, name: nm, email: '', phone: '', site: '', notes: '' }); });
      // cria laboratórios a partir dos nomes já usados nos certificados (carrega e-mail/telefone se houver)
      (d.certificates || []).forEach((c) => {
        const nm = (c.lab || '').trim(); if (!nm) return;
        let lab = findLab(nm);
        if (!lab) { lab = { id: 'lab_' + Math.random().toString(36).slice(2, 8), name: nm, email: c.labEmail || '', phone: c.labPhone || '', site: '', notes: '' }; d.labs.push(lab); }
        else { if (!lab.email && c.labEmail) lab.email = c.labEmail; if (!lab.phone && c.labPhone) lab.phone = c.labPhone; }
      });
      d._labsSeed = true;
    }
    // one-time: promover Domínio & Infra p/ controle editável+sincronizado (3 domínios reais)
    if (!d._infraPromote2) {
      d.webDomains = JSON.parse(JSON.stringify(SEED.webDomains));
      if (!Array.isArray(d.dnsRecords) || d.dnsRecords.length === 0) {
        d.dnsRecords = (d.infra && Array.isArray(d.infra.dns) && d.infra.dns.length) ? JSON.parse(JSON.stringify(d.infra.dns)) : JSON.parse(JSON.stringify(SEED.dnsRecords));
      }
      d._infraPromote2 = true;
    }
    // one-time: semear os portais SharePoint (inclusive p/ quem já tinha o app instalado)
    if (!d._spSeed) {
      if (!Array.isArray(d.sharepoint) || d.sharepoint.length === 0) d.sharepoint = JSON.parse(JSON.stringify(SEED.sharepoint));
      d._spSeed = true;
    }
    // one-time: remover as licenças de exemplo (controle será refeito do zero)
    if (!d._licReset) { d.licenses = []; d._licReset = true; }
    // one-time: tirar do Cofre as categorias que viraram abas próprias (Servidor, BitLocker)
    if (!d._vaultCats2) { d.vault = (d.vault || []).filter((v) => VAULT_REMOVED.indexOf(v.category) === -1); d._vaultCats2 = true; }
    // one-time: trocar impressoras de exemplo pelas reais (com links de driver oficiais)
    if (!d._printersReal) { d.printers = JSON.parse(JSON.stringify(REAL_PRINTERS)); d._printersReal = true; }
    // one-time: remover os registros DNS de exemplo MX e TXT (dn3, dn4)
    if (!d._dnsTrim) { if (d.infra && Array.isArray(d.infra.dns)) d.infra.dns = d.infra.dns.filter((r) => r.id !== 'dn3' && r.id !== 'dn4'); d._dnsTrim = true; }
    // one-time: corrigir A e CNAME com os valores reais
    if (!d._dnsReal && d.infra && Array.isArray(d.infra.dns)) {
      const a = d.infra.dns.find((r) => r.id === 'dn1'); if (a) a.value = '216.198.79.1';
      const c = d.infra.dns.find((r) => r.id === 'dn2'); if (c) c.value = 'c748F9766727F37a.vercel-dns-017.com';
      d._dnsReal = true;
    }
    // one-time: atualizar comandos com descrições/guias detalhados (preserva os que o usuário criou)
    if (!d._cmdsRich && Array.isArray(d.commands)) {
      RICH_COMMANDS.forEach((rc) => {
        const ex = d.commands.find((c) => c.id === rc.id);
        if (ex) Object.assign(ex, rc); else d.commands.push(JSON.parse(JSON.stringify(rc)));
      });
      d._cmdsRich = true;
    }
    // computer fields added in v2
    if (Array.isArray(d.computers)) d.computers.forEach((c) => {
      if (c.serial == null) c.serial = '';
      if (c.office == null) c.office = '';
      if (c.antivirus == null) c.antivirus = '';
    });
    if (Array.isArray(d.team)) d.team.forEach((u) => { if (u.sector == null) u.sector = ''; });
    // one-time: definir o link real do Dashboard de Produção (se ainda vazio)
    if (!d._prodUrlSet) { if (d.settings && !d.settings.prodDashboardUrl) d.settings.prodDashboardUrl = 'https://convergasapp.com.br/tv'; d._prodUrlSet = true; }
    // one-time: atualizar o link de produção para o domínio oficial convergasapp.com.br/tv
    if (!d._prodUrl2026 && d.settings) { d.settings.prodDashboardUrl = 'https://convergasapp.com.br/tv'; d._prodUrl2026 = true; }

    // one-time: montar o GRAFO RELACIONAL (fonte única user↔máquina, telefone→user, antivírus→licença)
    if (!d._relGraphSeed) {
      const team = Array.isArray(d.team) ? d.team : [];
      const comps = Array.isArray(d.computers) ? d.computers : [];
      const norm = (s) => (s || '').toString().trim().toLowerCase();
      // 1) reconciliar Usuário↔Máquina a partir do machineId existente (sem drift)
      team.forEach((u) => { if (u.machineId) { const c = comps.find((x) => x.id === u.machineId); if (c && !c.userId) c.userId = u.id; } });
      // 2) periféricos: assignments string[] -> [{userId, machineId}]
      if (Array.isArray(d.inventory)) d.inventory.forEach((i) => {
        i.assignments = (i.assignments || []).map((a) => {
          if (a && typeof a === 'object') return { userId: a.userId || '', machineId: a.machineId || '' };
          const u = team.find((t) => t.id === a);
          const pm = (u && u.machineId) ? u.machineId : ((comps.find((c) => c.userId === a) || {}).id || '');
          return { userId: a, machineId: pm || '' };
        });
      });
      // 3) telefone -> usuário por nome (match exato; fallback 1º nome só se único)
      if (Array.isArray(d.phones)) d.phones.forEach((p) => {
        if (p.userId) return;
        const nm = norm(p.user);
        if (!nm) { p.userId = ''; return; }
        let u = team.find((t) => norm(t.name) === nm);
        if (!u) { const fn = nm.split(' ')[0]; const cands = team.filter((t) => norm(t.name).split(' ')[0] === fn); if (cands.length === 1) u = cands[0]; }
        p.userId = u ? u.id : '';
      });
      // 4) antivírus (texto de cada PC) -> licença agrupada por produto real
      d.licenses = Array.isArray(d.licenses) ? d.licenses : [];
      const avKey = (s) => {
        const t = norm(s); if (!t) return null;
        if (t.includes('kaspersky')) return 'Kaspersky';
        if (t.includes('macafee') || t.includes('mcafee')) return 'McAfee';
        if (t.includes('defender')) return 'Windows Defender';
        if (t.includes('verificar') || t.includes('instalar') || t === '—' || t === '-') return null;
        return s.trim();
      };
      const groups = {};
      comps.forEach((c) => { const k = avKey(c.antivirus); if (!k) return; (groups[k] = groups[k] || []).push(c); });
      Object.keys(groups).forEach((prod) => {
        const machines = groups[prod];
        const lic = { id: uid('li'), name: prod + ' — Antivírus', vendor: prod, type: 'Antivírus', seats: machines.length + ' PCs', seatsTotal: machines.length, owner: '', purchaseDate: '', renewalDate: '', adminUrl: '', code: '', notes: 'Criada automaticamente a partir do antivírus das máquinas.', assignments: machines.map((c) => ({ userId: c.userId || '', machineId: c.id })) };
        d.licenses.push(lic);
        machines.forEach((c) => { c.antivirusLicenseId = lic.id; });
      });
      d._relGraphSeed = true;
    }
    // backfill dos campos dos novos vínculos (forward-compat)
    if (Array.isArray(d.licenses)) d.licenses.forEach((l) => { if (!Array.isArray(l.assignments)) l.assignments = []; if (l.seatsTotal == null) l.seatsTotal = Number(l.seats) || l.assignments.length || 0; });
    if (Array.isArray(d.phones)) d.phones.forEach((p) => { if (p.userId == null) p.userId = ''; });
    if (Array.isArray(d.vault)) d.vault.forEach((v) => { if (v.userId == null) v.userId = ''; if (v.machineId == null) v.machineId = ''; });
    if (Array.isArray(d.computers)) d.computers.forEach((c) => { if (c.antivirusLicenseId == null) c.antivirusLicenseId = ''; });
    return d;
  }

  let data = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const d = migrate(JSON.parse(raw)); persist(d); return d; }
    } catch (e) {}
    const fresh = migrate(JSON.parse(JSON.stringify(SEED)));
    persist(fresh);
    return fresh;
  }

  function persist(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d || data)); } catch (e) {}
  }

  /* ---- ponte com a nuvem (best-effort; nunca quebra a UI) ---- */
  function cloudPush(coll, item) {
    try { if (window.Cloud && window.Cloud.ok && item) window.Cloud.pushItem(coll, item).catch(() => {}); } catch (e) {}
  }
  function cloudDelete(coll, id) {
    try { if (window.Cloud && window.Cloud.ok) window.Cloud.deleteItem(coll, id).catch(() => {}); } catch (e) {}
  }
  function cloudSettings() {
    try { if (window.Cloud && window.Cloud.ok) window.Cloud.pushSettings(data.settings).catch(() => {}); } catch (e) {}
  }

  const Store = {
    get all() { return data; },
    get: (k) => data[k],
    save: () => persist(data),

    add(coll, obj) {
      obj.id = obj.id || uid(coll.slice(0, 2));
      data[coll].push(obj);
      persist();
      cloudPush(coll, obj);
      return obj;
    },
    update(coll, id, patch) {
      const item = data[coll].find((x) => x.id === id);
      if (item) { Object.assign(item, patch); persist(); cloudPush(coll, item); }
      return item;
    },
    remove(coll, id) {
      // integridade referencial: limpa vínculos antes de apagar
      if (coll === 'team') this.cascadeDeleteUser(id);
      else if (coll === 'computers') this.cascadeDeleteMachine(id);
      data[coll] = data[coll].filter((x) => x.id !== id);
      persist();
      cloudDelete(coll, id);
    },
    find: (coll, id) => data[coll].find((x) => x.id === id),

    /* ---- periféricos ⇄ usuário/máquina (assignments = [{userId, machineId}]) ---- */
    availableOf(item) { return Math.max(0, (Number(item.qty) || 0) - ((item.assignments || []).length)); },
    itemsForUser(userId) { return data.inventory.filter((i) => (i.assignments || []).some((a) => a.userId === userId)); },
    itemsForMachine(machineId) { return data.inventory.filter((i) => (i.assignments || []).some((a) => a.machineId === machineId)); },
    // status follows allocation: any unit allocated → em_uso; none → disponivel (reserva is kept)
    recalcItem(item) {
      const used = (item.assignments || []).length;
      if (used > 0) item.status = 'em_uso';
      else if (item.status !== 'reserva') item.status = 'disponivel';
    },
    assign(itemId, userId, machineId) {
      const it = this.find('inventory', itemId);
      if (!it || !userId) return false;
      it.assignments = it.assignments || [];
      if (it.assignments.some((a) => a.userId === userId)) return false;   // já vinculado
      if (this.availableOf(it) <= 0) return false;                        // sem unidades livres
      it.assignments.push({ userId, machineId: machineId || '' });
      this.recalcItem(it); persist(); cloudPush('inventory', it); return true;
    },
    unassign(itemId, userId) {
      const it = this.find('inventory', itemId);
      if (!it) return false;
      it.assignments = (it.assignments || []).filter((a) => a.userId !== userId);
      this.recalcItem(it); persist(); cloudPush('inventory', it); return true;
    },
    setItemMachine(itemId, userId, machineId) {
      const it = this.find('inventory', itemId);
      if (!it) return false;
      const a = (it.assignments || []).find((x) => x.userId === userId);
      if (!a) return false;
      a.machineId = machineId || '';
      persist(); cloudPush('inventory', it); return true;
    },
    // drop all links to a user (used when a user is deleted)
    unassignAllForUser(userId) {
      data.inventory.forEach((i) => {
        if ((i.assignments || []).some((a) => a.userId === userId)) {
          i.assignments = i.assignments.filter((a) => a.userId !== userId);
          this.recalcItem(i);
          cloudPush('inventory', i);
        }
      });
      persist();
    },

    /* ---- usuário ⇄ máquina (fonte única da verdade: computers.userId; N máquinas por usuário) ---- */
    machinesForUser(userId) { return data.computers.filter((c) => c.userId === userId); },
    userOfMachine(machineId) { const c = this.find('computers', machineId); return c && c.userId ? this.find('team', c.userId) : null; },
    primaryMachine(userId) {
      const u = this.find('team', userId); if (!u) return null;
      const mine = this.machinesForUser(userId);
      if (u.machineId) { const p = mine.find((c) => c.id === u.machineId); if (p) return p; }
      return mine[0] || null;
    },
    // grava a relação pelo lado autoritativo (computers.userId) e mantém a máquina primária do usuário
    linkUserMachine(userId, machineId) {
      if (machineId) { const c = this.find('computers', machineId); if (c) { c.userId = userId; cloudPush('computers', c); } }
      const u = this.find('team', userId); if (u) { u.machineId = machineId || ''; cloudPush('team', u); }
      persist();
    },

    /* ---- licenças ⇄ usuário/máquina (assentos) ---- */
    licenseSeatsUsed(lic) { return (lic.assignments || []).length; },
    licenseSeatsFree(lic) { return Math.max(0, (Number(lic.seatsTotal) || 0) - this.licenseSeatsUsed(lic)); },
    licensesForUser(userId) { return data.licenses.filter((l) => (l.assignments || []).some((a) => a.userId === userId)); },
    licensesForMachine(machineId) { return data.licenses.filter((l) => (l.assignments || []).some((a) => a.machineId === machineId)); },
    assignLicense(licId, holder) {
      const l = this.find('licenses', licId);
      if (!l || !holder || (!holder.userId && !holder.machineId)) return false;
      l.assignments = l.assignments || [];
      if (this.licenseSeatsFree(l) <= 0) return false;
      l.assignments.push({ userId: holder.userId || '', machineId: holder.machineId || '' });
      persist(); cloudPush('licenses', l); return true;
    },
    unassignLicense(licId, idx) {
      const l = this.find('licenses', licId);
      if (!l || !Array.isArray(l.assignments)) return false;
      l.assignments.splice(idx, 1);
      persist(); cloudPush('licenses', l); return true;
    },
    // define a licença de antivírus de uma máquina mantendo os assentos coerentes (1 assento por máquina)
    setMachineAntivirus(machineId, licId, userId) {
      data.licenses.filter((l) => l.type === 'Antivírus').forEach((l) => {
        const before = (l.assignments || []).length;
        l.assignments = (l.assignments || []).filter((a) => a.machineId !== machineId);
        if (l.assignments.length !== before) cloudPush('licenses', l);
      });
      const c = this.find('computers', machineId); if (c) c.antivirusLicenseId = licId || '';
      if (licId) {
        const l = this.find('licenses', licId);
        if (l) {
          l.assignments = l.assignments || [];
          if ((Number(l.seatsTotal) || 0) <= l.assignments.length) l.seatsTotal = l.assignments.length + 1; // auto-expande o total
          l.assignments.push({ userId: userId || '', machineId });
          cloudPush('licenses', l);
        }
      }
      persist();
    },

    /* ---- telefonia / cofre ---- */
    phonesForUser(userId) { return data.phones.filter((p) => p.userId === userId); },
    vaultForUser(userId) { return data.vault.filter((v) => v.userId === userId); },
    vaultForMachine(machineId) { return data.vault.filter((v) => v.machineId === machineId); },

    /* ---- resolver central: subgrafo pronto p/ os painéis 360° ---- */
    linksForUser(userId) {
      return {
        machines: this.machinesForUser(userId),
        peripherals: this.itemsForUser(userId),
        licenses: this.licensesForUser(userId),
        phones: this.phonesForUser(userId),
        vault: this.vaultForUser(userId),
      };
    },
    linksForMachine(machineId) {
      return {
        user: this.userOfMachine(machineId),
        peripherals: this.itemsForMachine(machineId),
        licenses: this.licensesForMachine(machineId),
        vault: this.vaultForMachine(machineId),
      };
    },

    /* ---- integridade referencial: limpa vínculos quando algo é apagado ---- */
    cascadeDeleteUser(userId) {
      data.computers.forEach((c) => { if (c.userId === userId) { c.userId = ''; cloudPush('computers', c); } });
      this.unassignAllForUser(userId);
      data.licenses.forEach((l) => { if ((l.assignments || []).some((a) => a.userId === userId)) { l.assignments = l.assignments.filter((a) => a.userId !== userId); cloudPush('licenses', l); } });
      data.phones.forEach((p) => { if (p.userId === userId) { p.userId = ''; cloudPush('phones', p); } });
      data.vault.forEach((v) => { if (v.userId === userId) { v.userId = ''; cloudPush('vault', v); } });
      persist();
    },
    cascadeDeleteMachine(machineId) {
      data.team.forEach((u) => { if (u.machineId === machineId) { u.machineId = ''; cloudPush('team', u); } });
      data.inventory.forEach((i) => { let ch = false; (i.assignments || []).forEach((a) => { if (a.machineId === machineId) { a.machineId = ''; ch = true; } }); if (ch) cloudPush('inventory', i); });
      data.licenses.forEach((l) => { let ch = false; (l.assignments || []).forEach((a) => { if (a.machineId === machineId) { a.machineId = ''; ch = true; } }); if (ch) cloudPush('licenses', l); });
      data.vault.forEach((v) => { if (v.machineId === machineId) { v.machineId = ''; cloudPush('vault', v); } });
      persist();
    },

    setSetting(k, v) { data.settings[k] = v; persist(); cloudSettings(); },

    reset() {
      data = migrate(JSON.parse(JSON.stringify(SEED)));
      persist();
    },
    export() { return JSON.stringify(data, null, 2); },
    uid,
  };

  /* ---- arquivos brutos (PDFs) em IndexedDB — quota grande, fora do localStorage ---- */
  const IDB_NAME = 'convergas_files_v1', IDB_STORE = 'files';
  function openDB() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(IDB_NAME, 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(IDB_STORE)) r.result.createObjectStore(IDB_STORE); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  const idbPut = (id, blob, meta) => openDB().then((db) => new Promise((res, rej) => { const tx = db.transaction(IDB_STORE, 'readwrite'); tx.objectStore(IDB_STORE).put({ blob, meta: meta || {} }, id); tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error); }));
  const idbGet = (id) => openDB().then((db) => new Promise((res) => { const tx = db.transaction(IDB_STORE, 'readonly'); const rq = tx.objectStore(IDB_STORE).get(id); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => res(null); }));
  const idbDel = (id) => openDB().then((db) => new Promise((res) => { const tx = db.transaction(IDB_STORE, 'readwrite'); tx.objectStore(IDB_STORE).delete(id); tx.oncomplete = () => res(true); tx.onerror = () => res(false); }));

  // PDFs de certificados: IndexedDB local (cache/offline) + bucket `files` na nuvem (fonte compartilhada).
  Store.files = {
    async put(id, blob, meta) {
      meta = meta || {};
      try { await idbPut(id, blob, meta); } catch (e) {}
      try {
        if (window.Cloud && window.Cloud.ok && meta.name) {
          const file = (blob instanceof File) ? blob : new File([blob], meta.name, { type: meta.type || 'application/pdf' });
          await window.Cloud.uploadFile('certificates', id, 'pdf', file);
        }
      } catch (e) {}
      return true;
    },
    async get(id) {
      const cert = (data.certificates || []).find((c) => c.id === id);
      const wantName = cert && cert.fileName;
      const local = await idbGet(id).catch(() => null);
      // usa o cache local só se casar com o arquivo atual do certificado; se o nome
      // divergir (PDF atualizado na nuvem), ignora o cache e rebaixa a versão nova.
      if (local && local.blob && (!wantName || (local.meta && local.meta.name === wantName))) return local;
      // baixar da nuvem usando o nome do arquivo salvo no certificado
      try {
        if (window.Cloud && window.Cloud.ok && wantName) {
          const blob = await window.Cloud.fetchFileBlob('certificates', id, 'pdf', wantName);
          if (blob) { const rec = { blob, meta: { name: wantName, type: blob.type || 'application/pdf', size: blob.size } }; idbPut(id, blob, rec.meta).catch(() => {}); return rec; }
        }
      } catch (e) {}
      // fallback: sem nuvem/arquivo novo, devolve o que houver em cache local
      if (local && local.blob) return local;
      return null;
    },
    async del(id) {
      try { await idbDel(id); } catch (e) {}
      try { if (window.Cloud && window.Cloud.ok) await window.Cloud.removeField('certificates', id, 'pdf'); } catch (e) {}
      return true;
    },
  };

  /* ---- sincronização inicial com a nuvem (offline-first: chamada após o boot) ---- */
  Store.syncFromCloud = async function (onChange) {
    if (!window.Cloud || !window.Cloud.ok) return false;
    let changed = false;
    try {
      const s = await window.Cloud.pullSettings();
      if (s) ['prodDashboardUrl', 'guidelineUrl'].forEach((k) => { if (s[k] != null && s[k] !== data.settings[k]) { data.settings[k] = s[k]; changed = true; } });
    } catch (e) {}
    for (const coll of window.Cloud.SYNCED) {
      try {
        const rows = await window.Cloud.pullCollection(coll);
        if (rows == null) continue;
        const local = Array.isArray(data[coll]) ? data[coll] : [];
        if (coll === 'certificates') {
          // certificados são conteúdo curado (fonte = nuvem): a nuvem vence por inteiro.
          if (rows.length) { if (JSON.stringify(rows) !== JSON.stringify(local)) { data[coll] = rows; changed = true; } }
          else if (local.length) { local.forEach((it) => window.Cloud.pushItem(coll, it).catch(() => {})); }
          continue;
        }
        // demais coleções: MERGE por id. A nuvem vence em conflito de id, MAS itens que só existem
        // localmente (cadastrados offline ou enquanto a nuvem estava pausada) são enviados pra nuvem —
        // nunca se perde dado e os navegadores/PCs convergem para a união.
        const cloudIds = new Set(rows.map((r) => r.id));
        const localOnly = local.filter((it) => it && it.id && !cloudIds.has(it.id));
        localOnly.forEach((it) => window.Cloud.pushItem(coll, it).catch(() => {}));
        const merged = rows.concat(localOnly);
        if (JSON.stringify(merged) !== JSON.stringify(local)) { data[coll] = merged; changed = true; }
      } catch (e) {}
    }
    if (changed) persist();
    if (onChange) { try { onChange(changed); } catch (e) {} }
    return changed;
  };

  window.Store = Store;
})();
