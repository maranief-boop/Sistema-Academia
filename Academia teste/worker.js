export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ reply: 'Use POST.' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    try {
      const body = await request.json();
      const text = (body.message || '').trim();
      if (!text) {
        return new Response(JSON.stringify({ reply: 'Digite uma mensagem.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const reply = findBestMatch(text);
      return new Response(JSON.stringify({ reply: reply }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (err) {
      return new Response(JSON.stringify({ reply: 'Erro interno. Fale no WhatsApp (18) 99999-9999.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

function normalize(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').trim();
}

function findBestMatch(text) {
  const input = normalize(text);
  const words = input.split(/\s+/).filter(function(w) { return w.length > 2; });

  var bestScore = 0;
  var bestReply = null;

  for (var i = 0; i < faq.length; i++) {
    var item = faq[i];
    var score = 0;

    // Keyword matching
    for (var k = 0; k < item.keywords.length; k++) {
      if (input.includes(item.keywords[k])) {
        // Exact keyword match = higher score
        score += 10;
      }
      // Partial word match
      for (var w = 0; w < words.length; w++) {
        if (item.keywords[k].includes(words[w]) || words[w].includes(item.keywords[k])) {
          score += 3;
        }
      }
    }

    // Bonus for question words matching question keywords
    if (item.questionWords && item.questionWords.length > 0) {
      for (var q = 0; q < item.questionWords.length; q++) {
        if (input.includes(item.questionWords[q])) {
          score += 8;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestReply = item.reply;
    }
  }

  if (bestScore >= 10) {
    return bestReply;
  }

  // Se score baixo, verifica se tem intencao de lead
  if (detectLeadIntent(input)) {
    return 'Que legal! Para agendar sua aula experimental gratuita, ligue ou mande mensagem no nosso WhatsApp (18) 99999-9999. Nosso time ja entra em contato!';
  }

  return 'Nao entendi sua duvida. 😅 Me chame no WhatsApp (18) 99999-9999 que nossa equipe responde rapidinho! 💪';
}

function detectLeadIntent(text) {
  var triggers = ['aula experimental', 'agendar', 'quero me inscrever', 'matricula', 'quero treinar', 'quero comecar', 'quero experimentar', 'quero fazer', 'primeira aula', 'aula gratis', 'experimentar', 'quero agendar', 'inscrever', 'matricular', 'comecar', 'vou', 'quero', 'gostaria'];
  for (var i = 0; i < triggers.length; i++) {
    if (text.includes(triggers[i])) return true;
  }
  return false;
}

var faq = [
  {
    keywords: ['quanto custa', 'preco', 'precos', 'preco', 'mensalidade', 'valor', 'valores', 'plano', 'planos', 'assinatura', 'caro', 'barato', 'pagamento', 'pagar', 'custa', 'investimento', 'promocao', 'promocao'],
    questionWords: ['quanto', 'preco', 'valor', 'custa', 'caro', 'barato', 'promocao'],
    reply: 'Temos planos a partir de <strong>R$ 89,90/mes</strong>. Aceitamos dinheiro, cartao de credito/debito e PIX. A primeira aula experimental e <strong>gratuita</strong>! 🎉 Quer agendar?'
  },
  {
    keywords: ['horario', 'horarios', 'funcionamento', 'abre', 'aberto', 'fecha', 'fechado', 'horas', 'hora', 'hora', 'funciona', 'funcionar'],
    questionWords: ['horario', 'abre', 'fecha', 'funciona'],
    reply: 'Funcionamos <strong>Segunda a Sexta</strong> das 06h as 22h e <strong>Sabados</strong> das 08h as 14h. Fechado aos domingos e feriados.'
  },
  {
    keywords: ['primeira aula', 'aula experimental', 'experimental', 'experimentar', 'gratis', 'gratuito', 'gratuita', 'teste', 'experimentar', 'aula gratis', 'aula gratuita'],
    questionWords: ['gratis', 'gratuito', 'experimental', 'teste', 'experimentar'],
    reply: 'Sim! Sua <strong>primeira aula e gratuita</strong> e sem compromisso! 🆓🎉 Quer agendar a sua? So chamar no WhatsApp (18) 99999-9999!'
  },
  {
    keywords: ['onde fica', 'endereco', 'endereco', 'local', 'localizacao', 'localizacao', 'fica', 'como chegar', 'andradina', 'chegar', 'mapa', 'centro', 'rua', 'avenida'],
    questionWords: ['onde', 'endereco', 'local', 'fica', 'chegar'],
    reply: 'Estamos na <strong>Rua Ademar de Barros, 456</strong>, Centro, Andradina-SP. 📍 Facil acesso e proximo ao centro da cidade! 🏙️'
  },
  {
    keywords: ['modalidade', 'modalidades', 'aula', 'aulas', 'treino', 'treinos', 'musculacao', 'musculacao', 'hipertrofia', 'hiit', 'jump', 'spinning', 'ginastica', 'ginastica', 'localizada', 'funcional', 'crossfit', 'lutas', 'boxe', 'jiu-jitsu', 'jiu jitsu', 'yoga', 'pilates', 'danca', 'danca', 'zumba'],
    questionWords: ['modalidade', 'quais', 'aula', 'treino', 'oferece', 'tem'],
    reply: 'Oferecemos: 🏋️ <strong>Musculacao</strong> | 🔥 <strong>HIIT</strong> | 🦘 <strong>Jump</strong> | 🚴 <strong>Spinning</strong> | 🤸 <strong>Ginastica Localizada</strong>. Temos tambem acompanhamento de professores em todas as aulas!'
  },
  {
    keywords: ['contato', 'telefone', 'whatsapp', 'falar', 'fale', 'fala', 'ligar', 'ligacao', 'zap', 'celular', 'email', 'email', 'contato', 'falar', 'fale conosco'],
    questionWords: ['contato', 'telefone', 'whatsapp', 'ligar', 'email'],
    reply: '📱 WhatsApp: <strong>(18) 99999-9999</strong> | 📧 Email: contato@ironfitandradina.com.br | 📍 Rua Ademar de Barros, 456, Centro - Andradina/SP'
  },
  {
    keywords: ['personal', 'personal trainer', 'personal training', 'acompanhamento', 'professor', 'professores', 'instrutor', 'instrutores', 'treinador', 'coach'],
    questionWords: ['personal', 'professor', 'instrutor', 'treinador', 'acompanhamento'],
    reply: 'Todos os professores sao formados em <strong>Educacao Fisica</strong> e oferecem acompanhamento durante os treinos. Tambem temos servico de <strong>Personal Trainer</strong> avulso para quem quer um plano individualizado! 💪'
  },
  {
    keywords: ['climatizado', 'climatizacao', 'climatizacao', 'ar condicionado', 'ar condicionado', 'ventilacao', 'ventilacao', 'frio', 'calor', 'quente', 'fresco', 'ventilador'],
    questionWords: ['climatizado', 'ar condicionado', 'calor', 'frio'],
    reply: 'Nossa academia e <strong>totalmente climatizada</strong> com ar-condicionado em todos os ambientes! 🥶 Treine com conforto o ano todo!'
  },
  {
    keywords: ['estacionamento', 'estacionar', 'parar', 'vaga', 'vagas', 'carro', 'moto', 'bicicleta', 'bike', 'estaciona', 'estacionamento gratuito'],
    questionWords: ['estacionamento', 'estacionar', 'vaga', 'parar'],
    reply: 'Temos <strong>estacionamento gratuito</strong> para alunos, com vagas para carros e motos. 🚗🛵'
  },
  {
    keywords: ['idade', 'menor', 'maior', 'adolescente', 'adolescente', 'crianca', 'crianca', 'jovem', 'jovens', 'minima', 'minimo', '14', '15', '16', '17', '18'],
    questionWords: ['idade', 'menor', 'crianca', 'adolescente', 'jovem', 'minima'],
    reply: 'Aceitamos alunos a partir de <strong>14 anos</strong>. Menores de 18 anos precisam de autorizacao dos pais ou responsaveis. 📝'
  },
  {
    keywords: ['matricula', 'matricula', 'inscricao', 'inscricao', 'cadastro', 'cadastrar', 'quero me inscrever', 'inscrever', 'se inscrever', 'matricular', 'matricular'],
    questionWords: ['matricula', 'inscricao', 'cadastro', 'inscrever', 'matricular'],
    reply: 'Para se matricular, venha ate nossa academia ou nos chame no WhatsApp (18) 99999-9999. A primeira aula e gratuita! 🎉'
  },
  {
    keywords: ['forma de pagamento', 'formas de pagamento', 'pagamento', 'pagar', 'dinheiro', 'cartao', 'credito', 'debito', 'pix', 'boleto', 'parcelamento', 'parcelar', 'parcela', 'mensal', 'mensalidades', 'trimestral', 'semestral', 'anual', 'anuidade'],
    questionWords: ['pagamento', 'pagar', 'cartao', 'dinheiro', 'pix', 'parcelar', 'boleto'],
    reply: 'Aceitamos <strong>dinheiro, cartao de credito, debito e PIX</strong>. Parcelamos no cartao de credito em ate 12x! 💳✨'
  },
  {
    keywords: ['avaliacao fisica', 'avaliacao', 'avaliacao', 'fisica', 'medida', 'medidas', 'bioimpedancia', 'pesagem', 'pesar', 'peso', 'altura', 'imc'],
    questionWords: ['avaliacao', 'medida', 'bioimpedancia', 'pesagem'],
    reply: 'Oferecemos <strong>avaliacao fisica</strong> com bioimpedancia para todos os alunos no momento da matricula. Acompanhamos sua evolucao a cada 3 meses! 📊'
  },
  {
    keywords: ['roupa', 'roupas', 'vestuario', 'traje', 'o que usar', 'o que levar', 'levar', 'precisa', 'necessario', 'obrigatorio', 'toalha', 'toalha', 'garrafa', 'agua', 'bebedouro', 'gelagua'],
    questionWords: ['roupa', 'levar', 'precisa', 'necessario', 'toalha', 'garrafa'],
    reply: 'Recomendamos: roupas leves e confortaveis, tenis apropriado, toalha e garrafa de agua. Temos bebedouro com agua gelada a disposicao! 🏋️👟💧'
  },
  {
    keywords: ['armario', 'armarios', 'vestiario', 'vestiarios', 'vestiario', 'trocar', 'banho', 'banheiro', 'chaveiro', 'cadeado', 'guardar', 'pertences'],
    questionWords: ['armario', 'vestiario', 'banheiro', 'banho', 'trocar'],
    reply: 'Temos <strong>vestiarios masculino e feminino</strong> com armarios individuais, chuveiros e banheiros. Traga seu cadeado para usar o armario! 🔐'
  },
  {
    keywords: ['wifi', 'wi-fi', 'internet', 'rede', 'sinal', 'conexao', 'online'],
    questionWords: ['wifi', 'internet', 'wi-fi'],
    reply: 'Sim, temos <strong>Wi-Fi gratis</strong> para alunos! 🛜💻'
  },
  {
    keywords: ['app', 'aplicativo', 'app', 'site', 'online', 'digital', 'agenda', 'agendamento'],
    questionWords: ['app', 'aplicativo', 'site', 'agenda'],
    reply: 'Estamos desenvolvendo um aplicativo exclusivo para alunos! Por enquanto, todo o contato e via WhatsApp (18) 99999-9999. 📱'
  },
  {
    keywords: ['cancelamento', 'cancelar', 'trancamento', 'trancar', 'sair', 'desistir', 'cancela', 'cancelar matricula', 'devolucao', 'reembolso'],
    questionWords: ['cancelamento', 'cancelar', 'trancar', 'sair', 'desistir'],
    reply: 'Para cancelar ou trancar sua matricula, entre em contato pelo WhatsApp (18) 99999-9999 e nossa equipe resolve para voce. 📋'
  },
  {
    keywords: ['feriado', 'feriados', 'domingo', 'domingos', 'funciona feriado', 'abre feriado', 'natal', 'ano novo', 'reveillon', 'carnaval', 'pascoa', 'páscoa'],
    questionWords: ['feriado', 'domingo', 'funciona'],
    reply: '<strong>Nao abrimos</strong> aos domingos e feriados. Funcionamos Seg-Sex 06h-22h e Sab 08h-14h.'
  },
  {
    keywords: ['convenio', 'convenios', 'parceria', 'parcerias', 'plano de saude', 'plano de saude', 'unimed', 'amil', 'bradesco', 'sulamerica', 'notre dame', 'empresa', 'corporativo', 'gympass', 'totalpass', 'wellhub'],
    questionWords: ['convenio', 'parceria', 'plano de saude', 'gympass', 'totalpass', 'wellhub', 'empresa'],
    reply: 'Temos parcerias com empresas locais e aceitamos <strong>Gympass / Wellhub</strong>! Consulte-nos pelo WhatsApp (18) 99999-9999 para ver se sua empresa tem convenio. 🤝'
  },
  {
    keywords: ['horario pico', 'horario de pico', 'lotado', 'cheio', 'movimento', 'muita gente', 'horario menos', 'horario vazio', 'melhor horario', 'pior horario'],
    questionWords: ['pico', 'lotado', 'cheio', 'movimento', 'vazio'],
    reply: 'Horarios de maior movimento: <strong>17h as 20h</strong> (Seg-Sex). Se prefere mais tranquilo, venha pela manha ate 10h ou apos 21h. 😉'
  },
  {
    keywords: ['musica', 'musica', 'playlist', 'som', 'aparelho', 'fone', 'fone de ouvido', 'auricular', 'caixa de som', 'bluetooth'],
    questionWords: ['musica', 'playlist', 'som', 'fone'],
    reply: 'Temos som ambiente com playlist variada. Voce tambem pode usar fones de ouvido durante o treino! 🎧🎵'
  },
  {
    keywords: ['evento', 'eventos', 'promocao', 'promocoes', 'promocao', 'promocoes', 'acao', 'campanha', 'black friday', 'comemoracao', 'aniversario'],
    questionWords: ['evento', 'promocao', 'campanha', 'black friday'],
    reply: 'Fique ligado no nosso Instagram e WhatsApp para ficar por dentro de promocoes e eventos especiais! 🎉📢'
  },
  {
    keywords: ['acessibilidade', 'acessivel', 'cadeirante', 'cadeira de rodas', 'rampa', 'deficiencia', 'deficiente', 'pcd', 'necessidades especiais'],
    questionWords: ['acessibilidade', 'cadeirante', 'deficiencia', 'pcd'],
    reply: 'Nossa academia possui <strong>acessibilidade</strong> com rampas e espacos adaptados para pessoas com mobilidade reduzida. ♿ Entre em contato para mais detalhes!'
  },
  {
    keywords: ['nutricionista', 'nutricao', 'nutricao', 'dieta', 'dieta', 'alimentacao', 'alimentacao', 'cardapio', 'reabilitacao', 'fisioterapia', 'fisioterapeuta'],
    questionWords: ['nutricionista', 'dieta', 'alimentacao', 'fisioterapia'],
    reply: 'Temos parceria com <strong>nutricionista</strong> para auxiliar na sua alimentacao! Consulte pelo WhatsApp (18) 99999-9999 para agendar. 🥗'
  },
  {
    keywords: ['avaliacao google', 'google', 'estrelas', 'avaliacao', 'avaliacoes', 'reputacao', 'opiniao', 'recomenda', 'recomendacao', 'bem avaliado'],
    questionWords: ['google', 'avaliacao', 'opiniao', 'recomenda'],
    reply: 'Temos otimas avaliacoes no Google! 😊 Veja o que nossos alunos falam: <a href="https://google.com/search?q=IronFit+Andradina" target="_blank">clique aqui</a>'
  },
  {
    keywords: ['instagram', 'facebook', 'youtube', 'tiktok', 'rede social', 'redes sociais', '@', 'seguir', 'follow', 'online'],
    questionWords: ['instagram', 'facebook', 'rede social', 'redes'],
    reply: 'Nos siga nas redes sociais! 📸 @ironfitandradina (Instagram) | 👍 IronFit Andradina (Facebook)'
  },
  {
    keywords: ['agua', 'bebedouro', 'gelagua', 'garrafa', 'hidratacao', 'hidratar', 'beber'],
    questionWords: ['agua', 'bebedouro', 'garrafa', 'hidratar'],
    reply: 'Temos <strong>bebedouro com agua gelada</strong> a disposicao. Tragam sua garrafa! 💧'
  },
  {
    keywords: ['fralda', 'troca', 'bebe', 'mae', 'maes', 'pai', 'pais', 'filho', 'crianca', 'bercario', 'espaco infantil'],
    questionWords: ['bebe', 'crianca', 'mae', 'fralda', 'bercario'],
    reply: 'No momento nao temos espaco infantil. Menores de 14 anos nao podem treinar. Verifique a idade minima na pagina.'
  },
  {
    keywords: ['hidromassagem', 'sauna', 'piscina', 'piscina', 'banheira', 'spa', 'lazer'],
    questionWords: ['sauna', 'piscina', 'hidromassagem', 'spa'],
    reply: 'Nao dispomos de sauna, piscina ou hidromassagem. Focamos em musculacao e aulas fitness de alta qualidade! 💪'
  },
];
