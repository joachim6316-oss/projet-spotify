// Chargement unique des données
fetch('data/data.json')
  .then(res => res.json())
  .then(data => {

    // ---- TOP 10 ARTISTES ----
    const artistes = {}
    data.forEach(track => {
      const nom = track.artists[0].name
      artistes[nom] = (artistes[nom] || 0) + 1
    })
    const top10 = Object.entries(artistes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    new Chart(document.getElementById('topArtistes'), {
      type: 'bar',
      data: {
        labels: top10.map(a => a[0]),
        datasets: [{
          label: 'Nombre de morceaux',
          data: top10.map(a => a[1]),
          backgroundColor: '#0d6efd'
        }]
      },
      options: { indexAxis: 'y' }
    })

    // ---- DISTRIBUTION GENRES ----
    const genres = {}
    data.forEach(track => {
      const g = track.artists[0].genres[0] || 'Autres'
      genres[g] = (genres[g] || 0) + 1
    })

    new Chart(document.getElementById('distGenres'), {
      type: 'pie',
      data: {
        labels: Object.keys(genres),
        datasets: [{ data: Object.values(genres) }]
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top'
          }
        }
      }
    })

    // ---- Rendre les données disponibles pour Alpine ----
    window.__spotifyData = data
  })


// ---- TABLEAU AVEC ALPINE ----
function tableauMusiques() {
  return {
    morceaux: [],
    recherche: '',

    init() {
      // Attendre que les données soient chargées
      const charger = () => {
        if (window.__spotifyData) {
          this.morceaux = window.__spotifyData
        } else {
          setTimeout(charger, 50)
        }
      }
      charger()
    },

    morceauxFiltres() {
      const q = this.recherche.toLowerCase()
      return this.morceaux.filter(track =>
        track.name.toLowerCase().includes(q) ||
        track.artists[0].name.toLowerCase().includes(q) ||
        track.album.name.toLowerCase().includes(q)
      )
    }
  }
}

// ---- ALBUMS AVEC ALPINE ----
function albums() {
  return {
    albumsListe: [],

    init() {
      const charger = () => {
        if (window.__spotifyData) {
          const albumsMap = {}
          window.__spotifyData.forEach(track => {
            const id = track.album.id
            if (!albumsMap[id]) {
              albumsMap[id] = {
                id: id,
                name: track.album.name,
                artist: track.artists[0].name,
                date: new Date(track.album.release_date).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric'
                }),
                image: track.album.images[0]?.url || '',
                titres: track.album.total_tracks,
                score: track.album.popularity
              }
            }
          })

          this.albumsListe = Object.values(albumsMap)
            .sort((a, b) => b.score - a.score)
            .slice(0, 12)
        } else {
          setTimeout(charger, 50)
        }
      }
      charger()
    }
  }
}

function ouvrirDetails(track) {
  document.getElementById('modalTitre').textContent = 'Détails du morceau'

  const dureeMin = Math.floor(track.duration_ms / 60000)
  const dureeSec = Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2, '0')

  const artistes = track.artists.map(a => `
    <div class="d-flex align-items-center gap-2 mb-2">
      <img src="${a.images?.[0]?.url || track.album.images[2]?.url}" 
           style="width:40px;height:40px;border-radius:50%;object-fit:cover;">
      <div>
        <strong>${a.name}</strong><br>
        <small class="text-muted">Popularité: ${a.popularity}/100 · Followers: ${a.followers?.total?.toLocaleString('fr-FR')}</small>
      </div>
    </div>
  `).join('')

  const genres = track.artists.flatMap(a => a.genres || [])
  const genresUniques = [...new Set(genres)]
  const genresBadges = genresUniques.map(g => `<span class="badge bg-secondary me-1">${g}</span>`).join('')

  const popularitePercent = track.popularity
  
  document.getElementById('modalContenu').innerHTML = `
    <div class="row">
      <!-- Colonne gauche : image album -->
      <div class="col-md-4">
        <img src="${track.album.images[0]?.url}" class="img-fluid rounded mb-2">
        <p class="fw-bold mb-0">${track.album.name}</p>
        <small class="text-muted">
          ${new Date(track.album.release_date).toLocaleDateString('fr-FR')} · ${track.album.total_tracks} titres
        </small>
        <div class="mt-2">
          <span class="badge bg-success">Popularité: ${track.album.popularity}/100</span>
        </div>
      </div>

      <!-- Colonne droite : infos -->
      <div class="col-md-8">
        <h5 class="mb-1">${track.name}</h5>

        ${track.preview_url ? `
          <p class="text-muted mb-1">Preview audio</p>
          <audio controls src="${track.preview_url}" class="w-100 mb-3"></audio>
        ` : '<p class="text-muted fst-italic mb-3">Pas de preview disponible</p>'}

        <p class="fw-semibold mb-2">Informations sur le morceau</p>
        <table class="table table-sm">
          <tr>
            <td>Durée</td>
            <td class="text-end"><span class="badge bg-primary">${dureeMin}:${dureeSec}</span></td>
          </tr>
          <tr>
            <td>Popularité</td>
            <td class="text-end">
              <div class="d-flex align-items-center gap-2 justify-content-end">
                <div class="progress flex-grow-1" style="height:8px;">
                  <div class="progress-bar bg-info" style="width:${popularitePercent}%"></div>
                </div>
                ${popularitePercent}/100
              </div>
            </td>
          </tr>
          <tr>
            <td>Numéro de piste</td>
            <td class="text-end">${track.track_number}</td>
          </tr>
          <tr>
            <td>Explicit</td>
            <td class="text-end">${track.explicit ? 'Oui' : 'Non'}</td>
          </tr>
        </table>

        <p class="fw-semibold mb-2">Artistes</p>
        ${artistes}

        ${genresUniques.length > 0 ? `
          <p class="fw-semibold mb-2">Genres</p>
          <div>${genresBadges}</div>
        ` : ''}

        <div class="text-end mt-3">
          <a href="${track.external_urls.spotify}" target="_blank" class="btn btn-success">
            🎵 Ouvrir dans Spotify
          </a>
        </div>
      </div>
    </div>
  `

  new bootstrap.Modal(document.getElementById('modalDetails')).show()
}   