document.addEventListener('DOMContentLoaded', () => {
  const apiUrl = 'http://localhost:4567/api/publicacoes';

  // Elementos do DOM
  const publicacoesContainer = document.getElementById('publicacoes-container');
  const detalhesContainer    = document.getElementById('detalhes-container');
  const formPublicacao       = document.getElementById('form-publicacao');
  const selectTipo           = document.getElementById('tipo');
  const camposLivro          = document.getElementById('campos-livro');
  const camposRevista        = document.getElementById('campos-revista');
  const camposEbook          = document.getElementById('campos-ebook');

  let publicacoesCache = [];

  function detectarTipo(pub) {
    if (pub.genero      !== undefined) return 'Livro';
    if (pub.edicao      !== undefined) return 'Revista';
    if (pub.tamanhoEmMB !== undefined) return 'Ebook';
    return 'Desconhecido';
  }

  // Exibe/oculta campos do formulário conforme o tipo selecionado
  selectTipo.addEventListener('change', () => {
    const t = selectTipo.value;
    camposLivro.style.display   = t === 'Livro'   ? 'block' : 'none';
    camposRevista.style.display = t === 'Revista' ? 'block' : 'none';
    camposEbook.style.display   = t === 'Ebook'   ? 'block' : 'none';
  });
  selectTipo.dispatchEvent(new Event('change')); // inicializa ocultando tudo

  async function carregarPublicacoes() {
    publicacoesContainer.innerHTML = '';
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      publicacoesCache = await res.json();

      if (publicacoesCache.length === 0) {
        publicacoesContainer.innerHTML = '<p>Nenhuma publicação cadastrada.</p>';
        return;
      }

      publicacoesCache.forEach(pub => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('publicacao-item');
        const tipo = detectarTipo(pub);
        itemDiv.innerHTML = `<strong>${pub.titulo || 'Título Desconhecido'}</strong> (${tipo})`;
        itemDiv.addEventListener('click', () => exibirDetalhes(pub.id));
        publicacoesContainer.appendChild(itemDiv);
      });
    } catch (err) {
      console.error('Erro ao carregar publicações:', err);
      publicacoesContainer.innerHTML =
        `<p>Falha ao carregar (veja console): ${err.message}</p>`;
    }
  }

  function exibirDetalhes(id) {
    const pub = publicacoesCache.find(p => p.id == id);
    if (!pub) {
      detalhesContainer.innerHTML = '<p>Publicação não encontrada.</p>';
      return;
    }

    const tipoSel = detectarTipo(pub);
    let html = `
      <h3>${pub.titulo || 'Sem título'}</h3>
      <p><strong>ID:</strong> ${pub.id}</p>
      <p><strong>Autor:</strong> ${pub.autor || '—'}</p>
      <p><strong>Editora:</strong> ${pub.editora || '—'}</p>
      <p><strong>Páginas:</strong> ${pub.numeroDePaginas || '—'}</p>
      <p><strong>Tipo:</strong> ${tipoSel}</p>
    `;

    if (tipoSel === 'Livro') {
      html += `
        <p><strong>Gênero:</strong> ${pub.genero || '—'}</p>
        <p><strong>Volume:</strong> ${pub.volume || '—'}</p>
        <p><strong>ISBN:</strong> ${pub.isbn || '—'}</p>
        <p><strong>Capítulos:</strong> ${pub.numeroDeCapitulos || '—'}</p>
      `;
    } else if (tipoSel === 'Revista') {
      html += `
        <p><strong>Edição:</strong> ${pub.edicao || '—'}</p>
        <p><strong>Assunto:</strong> ${pub.assunto || '—'}</p>
        <p><strong>ISSN:</strong> ${pub.issn || '—'}</p>
        <p><strong>Artigos:</strong> ${pub.numeroDeArtigos || '—'}</p>
      `;
    } else if (tipoSel === 'Ebook') {
      html += `
        <p><strong>Tamanho (MB):</strong> ${pub.tamanhoEmMB || '—'}</p>
        <p><strong>Formato:</strong> ${pub.formato || '—'}</p>
      `;
    }

    detalhesContainer.innerHTML = html;
  }

  formPublicacao.addEventListener('submit', async e => {
    e.preventDefault();

    const formData = new FormData(formPublicacao);
    const tipoPub  = formData.get('tipo');
    const titulo   = formData.get('titulo').trim();
    const autor    = formData.get('autor').trim();
    const editora  = formData.get('editora').trim();
    const numPag   = parseInt(formData.get('numeroDePaginas'), 10);

    const dataToSend = {
      titulo,
      autor,
      editora,
      numeroDePaginas: isNaN(numPag) ? null : numPag,
      tipo: tipoPub   // ← **IMPORTANTE**: sem isto, a API retorna 400!
    };

    switch (tipoPub) {
      case 'Livro':
        dataToSend.genero            = formData.get('genero').trim();
        dataToSend.volume            = formData.get('volume').trim();
        dataToSend.isbn              = formData.get('isbn').trim();
        dataToSend.numeroDeCapitulos = parseInt(formData.get('numeroDeCapitulos'), 10) || null;
        break;
      case 'Revista':
        dataToSend.edicao          = formData.get('edicao').trim();
        dataToSend.assunto         = formData.get('assunto').trim();
        dataToSend.issn            = formData.get('issn').trim();
        dataToSend.numeroDeArtigos = parseInt(formData.get('numeroDeArtigos'), 10) || null;
        break;
      case 'Ebook':
        dataToSend.tamanhoEmMB = parseFloat(formData.get('tamanhoEmMB')) || null;
        dataToSend.formato     = formData.get('formato').trim();
        break;
      default:
        alert('Tipo de publicação inválido!');
        return;
    }

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });
      if (!res.ok) {
        // para ver a mensagem exata de erro do backend:
        const errJson = await res.json();
        throw new Error(errJson.message || `HTTP ${res.status}`);
      }
      await res.json();
      carregarPublicacoes();
      formPublicacao.reset();
      selectTipo.dispatchEvent(new Event('change'));
    } catch (err) {
      console.error('Erro ao adicionar publicação:', err);
      alert(`Não foi possível adicionar: ${err.message}`);
    }
  });

  carregarPublicacoes();
});