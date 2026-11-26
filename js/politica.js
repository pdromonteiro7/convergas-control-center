/* =============================================================================
   POLÍTICA DE PRIVACIDADE E TERMOS DE USO DOS SISTEMAS CONVERGAS
   Documento controlado (ISO 9001 7.5 / IATF 16949 7.5.3) — fonte única para os
   três sistemas: Convergasapp, LifeGas e Control Center. Renderizado na aba
   T.I › Privacidade & Termos (js/app.js, PAGES.privacidade) e impresso em PDF.

   COMO REVISAR: altere o texto aqui, suba a REVISÃO, a DATA e acrescente uma
   linha no HISTÓRICO. Itens entre [[colchetes duplos]] são pendências que
   aparecem destacadas na tela e precisam ser preenchidas antes da aprovação.
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
    titulo: 'Política de Privacidade e Termos de Uso dos Sistemas Convergas',
    codigo: 'POL-TI-001',
    revisao: '00',
    data: '2026-11-26',
    status: 'Minuta — aguardando revisão jurídica e aprovação',
    elaborado: 'T.I · Convergas',
    aprovado: '[[Nome e cargo de quem aprova]]',
    controladora: CONTROLADORA,

    historico: [
      { rev: '00', data: '2026-11-26', desc: 'Emissão inicial (minuta). Abrange Convergasapp, LifeGas e Control Center.' },
    ],

    sistemas: [
      { id: 'A', nome: 'Convergasapp', url: 'convergasapp.com.br', icone: 'box',
        resumo: 'Rastreabilidade de conjuntos fornecidos às montadoras (Volkswagen e IVECO).' },
      { id: 'B', nome: 'LifeGas', url: 'lifegas.com.br', icone: 'activity',
        resumo: 'Rastreabilidade dos serviços de aumento de autonomia (sistema dual-fuel diesel/GNV) para transportadoras e demais clientes.' },
      { id: 'C', nome: 'Control Center', url: 'uso interno', icone: 'grid',
        resumo: 'Sistema interno da Convergas para controle de documentos, setores, pessoas e infraestrutura.' },
    ],

    secoes: [
      { t: '1. Objetivo e abrangência', html: `
        <p>Este documento estabelece como a ${CONTROLADORA.razao} ("Convergas") trata dados pessoais e quais são as regras de uso dos seus sistemas, em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais — LGPD).</p>
        <p>Aplica-se aos três sistemas da Convergas — <b>Convergasapp</b>, <b>LifeGas</b> e <b>Control Center</b> — e a todas as pessoas que os utilizam: colaboradores, prestadores de serviço, clientes e seus representantes. As particularidades de cada sistema estão nos Anexos A, B e C.</p>` },

      { t: '2. Controladora e encarregado', html: `
        <table class="pt-info">
          <tr><th>Controladora</th><td>${CONTROLADORA.razao} · CNPJ ${CONTROLADORA.cnpj}</td></tr>
          <tr><th>Endereço</th><td>${CONTROLADORA.endereco}</td></tr>
          <tr><th>Encarregado (DPO)</th><td>[[Nome do encarregado]] · [[privacidade@convergas.com.br]]</td></tr>
          <tr><th>Canal do titular</th><td>Solicitações relativas a dados pessoais devem ser enviadas ao e-mail do encarregado.</td></tr>
        </table>` },

      { t: '3. Definições', html: `
        <ul>
          <li><b>Dado pessoal:</b> informação relacionada a pessoa natural identificada ou identificável (ex.: nome, telefone, e-mail, assinatura, imagem).</li>
          <li><b>Titular:</b> pessoa a quem os dados se referem.</li>
          <li><b>Tratamento:</b> qualquer operação com dados pessoais (coleta, registro, armazenamento, consulta, compartilhamento, eliminação etc.).</li>
          <li><b>Controladora:</b> a Convergas, que decide sobre o tratamento.</li>
          <li><b>Operador:</b> quem trata dados em nome da Convergas (ex.: provedores de hospedagem e banco de dados).</li>
          <li><b>Usuário:</b> quem acessa os sistemas com login e senha, ou por link de acesso fornecido pela Convergas.</li>
        </ul>` },

      { t: '4. Dados pessoais tratados e finalidades', html: `
        <p>A Convergas trata apenas os dados necessários às finalidades abaixo (princípio da necessidade):</p>
        <table class="pt-tab">
          <tr><th>Categoria</th><th>Exemplos</th><th>Finalidade</th></tr>
          <tr><td>Identificação de usuários</td><td>Nome, e-mail corporativo, perfil de acesso, foto de perfil (opcional)</td><td>Autenticação, controle de acesso e registro de quem executou cada ação</td></tr>
          <tr><td>Contatos de clientes</td><td>Nome do responsável, telefone, e-mail</td><td>Execução do contrato, comunicação técnica e envio de relatórios</td></tr>
          <tr><td>Registros de serviço</td><td>Nome e assinatura do técnico e do motorista, data e hora, fotos do veículo e dos componentes</td><td>Rastreabilidade, comprovação do serviço, emissão do Atestado de Conformidade (Portaria Inmetro nº 130/2022) e garantia</td></tr>
          <tr><td>Dados de colaboradores (Control Center)</td><td>Cadastro funcional, treinamentos, integrações, equipamentos atribuídos</td><td>Gestão de pessoas, qualificação (ISO 9001 7.2 / IATF 7.2) e gestão de ativos de T.I.</td></tr>
          <tr><td>Registros técnicos de acesso</td><td>Data e hora de login, ações realizadas</td><td>Segurança da informação e auditoria</td></tr>
        </table>
        <p>Os sistemas <b>não</b> têm por finalidade tratar dados pessoais sensíveis (art. 5º, II). Placas e dados de veículos são dados da empresa cliente; podem se tornar dados pessoais quando associados a uma pessoa e, nesse caso, recebem a mesma proteção.</p>` },

      { t: '5. Bases legais', html: `
        <p>O tratamento se apoia nas seguintes hipóteses do art. 7º da LGPD, conforme o caso:</p>
        <ul>
          <li><b>Cumprimento de obrigação legal ou regulatória</b> (inciso II) — registros exigidos pela Portaria Inmetro nº 130/2022 e demais normas aplicáveis à instalação de sistemas de GNV;</li>
          <li><b>Execução de contrato</b> (inciso V) — prestação dos serviços contratados pelos clientes e relação de trabalho com colaboradores;</li>
          <li><b>Exercício regular de direitos</b> (inciso VI) — guarda de evidências para garantia, auditorias e eventuais processos;</li>
          <li><b>Legítimo interesse</b> (inciso IX) — segurança dos sistemas, melhoria contínua e rastreabilidade exigida pelos sistemas de gestão da qualidade (ISO 9001 e IATF 16949).</li>
        </ul>
        <p>Por isso, o uso dos sistemas não depende de consentimento. Quando alguma funcionalidade depender de consentimento, ele será solicitado de forma específica e poderá ser revogado.</p>` },

      { t: '6. Compartilhamento e operadores', html: `
        <p>Os dados não são vendidos nem cedidos para fins comerciais. Podem ser compartilhados somente:</p>
        <ul>
          <li>com o <b>próprio cliente</b> titular do serviço (relatórios, atestados e links de acompanhamento da sua frota);</li>
          <li>com <b>operadores</b> que hospedam e processam os dados em nome da Convergas — atualmente provedores de banco de dados e armazenamento em nuvem (Supabase) e de hospedagem das aplicações (Vercel) —, sob obrigações de confidencialidade e segurança;</li>
          <li>com <b>autoridades e órgãos reguladores</b> (ex.: Inmetro, organismos de inspeção, auditores de certificação) quando exigido por lei, norma ou auditoria.</li>
        </ul>
        <p><b>Transferência internacional:</b> os provedores de nuvem podem armazenar dados em servidores fora do Brasil. Nesses casos a transferência ocorre com base no art. 33 da LGPD, com provedores que adotam padrões de segurança compatíveis.</p>` },

      { t: '7. Retenção e eliminação dos dados', html: `
        <table class="pt-tab">
          <tr><th>Registro</th><th>Prazo de guarda</th></tr>
          <tr><td>Processos de serviço, atestados, fotos e assinaturas (Convergasapp e LifeGas)</td><td>[[Vida útil do sistema instalado + 5 anos]], ou o prazo exigido pela norma aplicável, o que for maior</td></tr>
          <tr><td>Registros da qualidade (ISO 9001 / IATF 16949)</td><td>[[Conforme procedimento de controle de registros — ex.: vida do produto + 1 ano calendário (IATF 7.5.3.2.1)]]</td></tr>
          <tr><td>Contas de usuários</td><td>Enquanto houver vínculo; desativadas no desligamento ou fim do contrato e eliminadas após [[2 anos]], preservando os registros de autoria</td></tr>
          <tr><td>Dados de colaboradores (Control Center)</td><td>Conforme prazos da legislação trabalhista e previdenciária</td></tr>
          <tr><td>Registros técnicos de acesso</td><td>Mínimo de 6 meses (Marco Civil da Internet, art. 15), até [[2 anos]]</td></tr>
        </table>
        <p>Encerrado o prazo, os dados são eliminados ou anonimizados, salvo as hipóteses de conservação do art. 16 da LGPD.</p>` },

      { t: '8. Segurança da informação', html: `
        <ul>
          <li>Acesso por login individual e senha, com <b>perfis e permissões por função</b> (ex.: administrador, comercial, técnico, cliente);</li>
          <li>Comunicação <b>criptografada (HTTPS)</b> e banco de dados com regras de acesso por linha (RLS);</li>
          <li>Arquivos e fotos em armazenamento privado, liberados por <b>links assinados e temporários</b>;</li>
          <li><b>Registro de autoria</b>: cada etapa registra quem executou, com data e hora automáticas;</li>
          <li>Links de relatório enviados a clientes são individuais, de difícil adivinhação e restritos aos dados daquele cliente;</li>
          <li>Cópias de segurança (backup) e acesso administrativo restrito à equipe de T.I.</li>
        </ul>` },

      { t: '9. Direitos do titular', html: `
        <p>O titular pode, a qualquer momento e mediante solicitação ao encarregado, exercer os direitos do art. 18 da LGPD: confirmação da existência de tratamento; acesso aos dados; correção de dados incompletos, inexatos ou desatualizados; anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos; portabilidade; informação sobre compartilhamentos; e revisão de decisões automatizadas.</p>
        <p>As solicitações serão respondidas em até <b>15 dias</b>. Alguns dados podem ser mantidos mesmo após o pedido de eliminação quando a guarda for exigida por lei ou norma (ex.: registros do Atestado de Conformidade).</p>` },

      { t: '10. Incidentes de segurança', html: `
        <p>Qualquer suspeita de incidente (acesso indevido, perda ou vazamento de dados) deve ser comunicada imediatamente à T.I e ao encarregado. Incidentes que possam acarretar risco ou dano relevante aos titulares serão comunicados à Autoridade Nacional de Proteção de Dados (ANPD) e aos titulares, nos termos do art. 48 da LGPD e da regulamentação da ANPD.</p>` },

      { t: '11. Cookies e armazenamento local', html: `
        <p>Os sistemas utilizam apenas cookies e armazenamento local <b>estritamente necessários</b> ao funcionamento: manter a sessão do usuário, preferências de tela e cópia local de dados para uso rápido. Não são usados cookies de publicidade nem de rastreamento por terceiros.</p>` },

      { t: '12. Termos de uso', html: `
        <ol>
          <li><b>Acesso.</b> Os sistemas são de uso restrito. O acesso é concedido pela Convergas a colaboradores, prestadores e clientes, de forma pessoal e intransferível.</li>
          <li><b>Credenciais.</b> O usuário é responsável pela guarda da sua senha e por todas as ações realizadas com o seu login. Suspeita de uso indevido deve ser comunicada à T.I imediatamente.</li>
          <li><b>Uso permitido.</b> Os sistemas devem ser usados apenas para as finalidades profissionais a que se destinam. É proibido inserir informações falsas, tentar acessar dados de outros clientes, contornar controles de segurança ou extrair dados em massa sem autorização.</li>
          <li><b>Veracidade dos registros.</b> Os registros de serviço (checklists, fotos, números de série, assinaturas) têm valor de evidência da qualidade. Devem refletir fielmente o que foi executado.</li>
          <li><b>Links de relatório.</b> Links de acompanhamento enviados ao cliente dão acesso aos dados da frota daquele cliente. Devem ser compartilhados apenas com pessoas autorizadas pela empresa cliente.</li>
          <li><b>Disponibilidade.</b> A Convergas empenha-se em manter os sistemas disponíveis, mas podem ocorrer interrupções para manutenção ou por fatores externos. Documentos emitidos (atestados, relatórios) podem ser salvos em PDF pelo usuário.</li>
          <li><b>Propriedade intelectual.</b> Os sistemas, marcas e layouts pertencem à Convergas. Os dados inseridos pelos clientes continuam sendo dos clientes.</li>
          <li><b>Suspensão.</b> O acesso pode ser suspenso ou encerrado em caso de violação destes termos, desligamento ou fim da relação contratual.</li>
        </ol>` },

      { t: '13. Revisão, vigência e foro', html: `
        <p>Este documento é controlado e revisado no mínimo <b>anualmente</b> ou sempre que houver mudança relevante nos sistemas ou na legislação. A versão vigente é a publicada no Control Center (T.I › Privacidade & Termos); cópias impressas não são controladas. Fica eleito o foro da comarca de Vinhedo/SP.</p>` },
    ],

    anexos: [
      { id: 'A', t: 'Anexo A — Convergasapp', html: `
        <p><b>Finalidade:</b> rastreabilidade dos conjuntos fornecidos às montadoras (Volkswagen e IVECO): identificação de componentes, números de série, lotes e registros de inspeção.</p>
        <p><b>Usuários:</b> colaboradores da Convergas e, quando aplicável, representantes das montadoras.</p>
        <p><b>Dados pessoais:</b> nome e login dos usuários, registros de autoria (quem inspecionou e quando) e eventuais contatos de representantes das montadoras.</p>
        <p><b>Requisitos específicos:</b> os registros de rastreabilidade atendem a requisitos específicos de clientes (CSR) das montadoras e à IATF 16949 (8.5.2.1 — identificação e rastreabilidade).</p>` },
      { id: 'B', t: 'Anexo B — LifeGas', html: `
        <p><b>Finalidade:</b> rastreabilidade dos serviços de aumento de autonomia (sistema dual-fuel diesel/GNV) para transportadoras e demais clientes: processos de instalação, desinstalação e manutenção, visitas técnicas, chamados, vencimentos e revisões, emissão do Atestado de Conformidade e relatórios da frota.</p>
        <p><b>Usuários:</b> equipe da Convergas (administração, comercial, técnicos) e clientes, por login próprio ou por link de relatório da frota.</p>
        <p><b>Dados pessoais:</b> nome, telefone e e-mail do contato do cliente; nome e <b>assinatura desenhada</b> do técnico e do motorista no recebimento e na entrega do veículo, com data e hora; fotos do veículo e dos componentes; leituras de quilometragem informadas pelo cliente.</p>
        <p><b>Aviso no ato da assinatura:</b> ao assinar na tela, o motorista e o técnico são informados de que os dados serão usados para registro e comprovação do serviço, conforme esta Política.</p>` },
      { id: 'C', t: 'Anexo C — Control Center', html: `
        <p><b>Finalidade:</b> gestão interna da Convergas: documentos da qualidade, setores, pessoas (RH), treinamentos e integrações, pós-vendas, infraestrutura e ativos de T.I.</p>
        <p><b>Usuários:</b> exclusivamente colaboradores da Convergas, com permissões por setor e por aba.</p>
        <p><b>Dados pessoais:</b> cadastro funcional dos colaboradores, registros de treinamento e integração, equipamentos e acessos atribuídos, e credenciais técnicas armazenadas no cofre de T.I (acesso restrito).</p>
        <p><b>Requisitos específicos:</b> registros de competência e conscientização (ISO 9001 7.2/7.3; IATF 7.2.1 e 7.2.2) e controle de informação documentada (ISO 9001 7.5).</p>` },
    ],
  };
})();
