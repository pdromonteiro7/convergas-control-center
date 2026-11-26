/* =============================================================================
   POLÍTICA DE PRIVACIDADE E TERMOS DE USO DOS SISTEMAS CONVERGAS
   Documento controlado — fonte única para os três sistemas: Convergasapp,
   LifeGas e Control Center. Renderizado em T.I › Privacidade & Termos
   (js/app.js, PAGES.privacidade) e impresso em PDF pelo botão da página.

   COMO REVISAR: altere o texto aqui, suba a REVISÃO, a DATA e acrescente uma
   linha no HISTÓRICO. As seções são numeradas automaticamente na ordem abaixo.
   ============================================================================= */
(function () {
  'use strict';

  const CONTROLADORA = {
    razao: 'CONVERGAS EQUIPAMENTOS E SERVIÇOS',
    cnpj: '68.347.343/0001-60',
    endereco: 'Rua Alfredo Acchar, 1135, Nova Vinhedo, Vinhedo/SP',
    site: 'www.convergas.com.br',
  };

  window.POLITICA_CONVERGAS = {
    titulo: 'Política de Privacidade e Termos de Uso',
    subtitulo: 'Sistemas Convergas · Convergasapp, LifeGas e Control Center',
    codigo: 'POL-TI-001',
    revisao: '00',
    data: '2026-11-26',
    status: 'Aprovado',
    elaborado: 'Pedro Monteiro',
    aprovado: 'Matheus Monteiro',
    controladora: CONTROLADORA,

    historico: [
      { rev: '00', data: '2026-11-26', desc: 'Emissão inicial. Abrange Convergasapp, LifeGas e Control Center.' },
    ],

    sistemas: [
      { id: 'A', nome: 'Convergasapp', url: 'convergasapp.com.br', icone: 'box', cor: '#4F8DF7',
        resumo: 'Rastreabilidade de conjuntos fornecidos às montadoras (Volkswagen e IVECO).' },
      { id: 'B', nome: 'LifeGas', url: 'lifegas.com.br', icone: 'activity', cor: '#2FD9A0',
        resumo: 'Rastreabilidade dos serviços de aumento de autonomia (dual-fuel diesel/GNV) para transportadoras.' },
      { id: 'C', nome: 'Control Center', url: 'uso interno', icone: 'grid', cor: '#F6AC42',
        resumo: 'Sistema interno de controle de documentos, setores, pessoas e infraestrutura.' },
    ],

    destaques: [
      { icone: 'users', t: 'Só colaboradores', s: 'Os sistemas são operados exclusivamente pela equipe Convergas.' },
      { icone: 'shield', t: 'Sem coleta externa', s: 'Não há cadastro público nem coleta direta de dados de clientes.' },
      { icone: 'lock', t: 'Acesso protegido', s: 'Login individual, permissões por função e conexão criptografada.' },
      { icone: 'clock', t: 'Guarda de 10 anos', s: 'Registros mantidos por 10 anos — duas requalificações.' },
    ],

    secoes: [
      { t: 'Objetivo e abrangência', html: `
        <p>Este documento define como a ${CONTROLADORA.razao} ("Convergas") trata dados pessoais e quais são as regras de uso dos seus sistemas, conforme a Lei nº 13.709/2018 (LGPD). Aplica-se aos sistemas <b>Convergasapp</b>, <b>LifeGas</b> e <b>Control Center</b>; as particularidades de cada um estão nos anexos.</p>
        <p>Os três sistemas são operados <b>exclusivamente por colaboradores da Convergas</b>, com login criado pela T.I. A Convergas <b>não coleta dados diretamente de clientes ou do público</b>: não há cadastro aberto, formulário público nem contas para pessoas de fora da empresa.</p>` },

      { t: 'Responsáveis', html: `
        <table class="pt-info">
          <tr><th>Controladora</th><td>${CONTROLADORA.razao} · CNPJ ${CONTROLADORA.cnpj}<br>${CONTROLADORA.endereco}</td></tr>
          <tr><th>Encarregado (LGPD)</th><td>Pedro Monteiro · pedro@convergas.com.br</td></tr>
          <tr><th>Aprovação</th><td>Matheus Monteiro · matheus@convergas.com.br</td></tr>
        </table>` },

      { t: 'Dados tratados e finalidades', html: `
        <table class="pt-tab">
          <tr><th>Dado</th><th>Finalidade</th></tr>
          <tr><td>Nome e e-mail corporativo dos colaboradores (usuários)</td><td>Login, controle de acesso e registro de quem executou cada etapa</td></tr>
          <tr><td>Contato comercial da empresa cliente (registrado pela equipe)</td><td>Execução do contrato e envio de relatórios</td></tr>
          <tr><td>Nome e assinatura do técnico e do motorista no recebimento/entrega do veículo</td><td>Comprovação e rastreabilidade do serviço</td></tr>
          <tr><td>Fotos do veículo e dos componentes, números de série</td><td>Rastreabilidade e emissão do Atestado de Conformidade (Portaria Inmetro nº 130/2022)</td></tr>
          <tr><td>Dados funcionais dos colaboradores (Control Center)</td><td>Gestão de pessoas, treinamentos e ativos de T.I.</td></tr>
        </table>
        <p>Não são tratados dados pessoais sensíveis. O tratamento se apoia no <b>cumprimento de obrigação legal/regulatória</b>, na <b>execução de contrato</b> e no <b>legítimo interesse</b> de rastreabilidade da qualidade (art. 7º, II, V e IX da LGPD).</p>` },

      { t: 'Compartilhamento', html: `
        <p>Os dados não são vendidos nem cedidos. São compartilhados somente com o <b>próprio cliente</b> (relatórios e atestados da sua frota), com os <b>provedores de nuvem</b> que hospedam os sistemas (Supabase e Vercel) e com <b>autoridades e auditores</b> quando exigido por lei ou norma.</p>` },

      { t: 'Guarda dos registros', html: `
        <p>Os registros de serviço e da qualidade (processos, atestados, fotos, números de série e assinaturas) são mantidos por <b>10 anos</b>, período equivalente a duas requalificações do sistema. Contas de colaboradores são desativadas no desligamento; os registros de autoria permanecem pelo mesmo prazo. Após esse período, os dados são eliminados ou anonimizados.</p>` },

      { t: 'Segurança da informação', html: `
        <ul>
          <li>Login individual com senha e <b>permissões por função</b>, concedidos somente a colaboradores;</li>
          <li>Conexão <b>criptografada (HTTPS)</b> e banco de dados com regras de acesso;</li>
          <li>Fotos e arquivos em armazenamento privado, liberados por <b>links temporários</b>;</li>
          <li>Cada etapa registra <b>quem executou</b>, com data e hora automáticas;</li>
          <li>Cópias de segurança e acesso administrativo restrito à T.I;</li>
          <li>Apenas cookies e armazenamento local <b>necessários ao funcionamento</b> (sessão e preferências).</li>
        </ul>` },

      { t: 'Direitos do titular', html: `
        <p>Qualquer pessoa pode solicitar ao encarregado (pedro@convergas.com.br) a confirmação, o acesso, a correção ou a eliminação dos seus dados, nos termos do art. 18 da LGPD. As solicitações são respondidas em até <b>15 dias</b>; dados exigidos por norma (ex.: registros do Atestado de Conformidade) são mantidos pelo prazo de guarda. Incidentes de segurança são comunicados à ANPD e aos titulares quando houver risco relevante.</p>` },

      { t: 'Termos de uso', html: `
        <ol>
          <li><b>Acesso.</b> Uso restrito aos colaboradores da Convergas. As contas são criadas pela T.I com o e-mail corporativo individual (<i>nome</i>@convergas.com.br) ou, para quem não tem e-mail próprio, a conta geral colaborador@convergas.com.br.</li>
          <li><b>Credenciais.</b> Cada usuário responde pela guarda da senha e pelas ações feitas com o seu login. Na conta geral, o <b>responsável pela etapa</b> deve sempre ser preenchido com o nome de quem executou.</li>
          <li><b>Uso permitido.</b> Somente para as atividades profissionais a que cada sistema se destina. É proibido inserir informações falsas ou contornar controles de segurança.</li>
          <li><b>Veracidade.</b> Checklists, fotos, números de série e assinaturas têm valor de evidência da qualidade e devem refletir fielmente o que foi executado.</li>
          <li><b>Links de relatório.</b> O link de relatório enviado a um cliente mostra apenas os dados da frota dele e deve ser compartilhado só com pessoas autorizadas pela empresa cliente.</li>
          <li><b>Suspensão.</b> O acesso é encerrado no desligamento ou em caso de uso indevido.</li>
        </ol>` },

      { t: 'Revisão e vigência', html: `
        <p>Documento revisado no mínimo <b>anualmente</b> ou quando houver mudança relevante nos sistemas ou na legislação. A versão vigente é a publicada no Control Center (T.I › Privacidade & Termos); cópias impressas não são controladas.</p>` },
    ],

    anexos: [
      { id: 'A', t: 'Convergasapp', html: `
        <p><b>Finalidade:</b> rastreabilidade dos conjuntos fornecidos às montadoras (Volkswagen e IVECO): componentes, números de série, lotes e inspeções, atendendo à IATF 16949 (8.5.2.1).</p>
        <p><b>Usuários e dados:</b> exclusivamente colaboradores da Convergas; nome, login e registro de quem inspecionou e quando.</p>` },
      { id: 'B', t: 'LifeGas', html: `
        <p><b>Finalidade:</b> rastreabilidade dos serviços de aumento de autonomia (dual-fuel diesel/GNV): instalação, manutenção, visitas, chamados, Atestado de Conformidade e relatórios da frota.</p>
        <p><b>Usuários e dados:</b> exclusivamente colaboradores da Convergas. O cliente não tem login: recebe, quando solicitado, um link de relatório da sua frota. Dados registrados pela equipe: contato comercial do cliente, nome e assinatura do técnico e do motorista, fotos do veículo e dos componentes.</p>` },
      { id: 'C', t: 'Control Center', html: `
        <p><b>Finalidade:</b> gestão interna — documentos da qualidade, setores, RH, treinamentos, pós-vendas e infraestrutura de T.I.</p>
        <p><b>Usuários e dados:</b> exclusivamente colaboradores, com permissões por setor e por aba; cadastro funcional, treinamentos e ativos atribuídos.</p>` },
    ],
  };
})();
