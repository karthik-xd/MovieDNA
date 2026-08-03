/**
 * MovieDNA - Main Application Controller
 * Manages State, UI Interactions, Engine Execution & TMDB Integration
 */

const TMDB_API_KEY = "16addb87af241cb14d7d06b3eee1b572";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

class MovieDNAApp {
  constructor() {
    this.moviesCorpus = [...SEED_MOVIES];
    this.engine = new MovieDNAEngine();
    this.selectedMovies = [];
    this.currentResults = null;
    this.filteredRecommendations = [];

    // DOM Elements
    this.searchInput = document.getElementById("movie-search-input");
    this.autocompleteDropdown = document.getElementById("autocomplete-dropdown");
    this.quickChipsContainer = document.getElementById("quick-chips-container");
    this.selectedGrid = document.getElementById("selected-movies-grid");
    this.selectedCount = document.getElementById("selected-count");
    this.btnClearAll = document.getElementById("btn-clear-all");
    this.btnAnalyze = document.getElementById("btn-analyze-dna");
    
    this.analyticsSection = document.getElementById("analytics-section");
    this.keywordsContainer = document.getElementById("keywords-container");
    this.genreBarsContainer = document.getElementById("genre-bars-container");
    this.btnExportDna = document.getElementById("btn-export-dna");

    this.recommendationsGrid = document.getElementById("recommendations-grid");
    this.sortSelect = document.getElementById("sort-select");
    this.genreFilterSelect = document.getElementById("genre-filter-select");
    this.resultsSubtitle = document.getElementById("results-subtitle");

    this.statMoviesCount = document.getElementById("stat-movies-count");
    this.statVocabCount = document.getElementById("stat-vocab-count");

    // Modal
    this.modal = document.getElementById("movie-modal");
    this.modalCloseBtn = document.getElementById("modal-close-btn");
    this.modalBanner = document.getElementById("modal-banner");
    this.modalTitle = document.getElementById("modal-title");
    this.modalMatch = document.getElementById("modal-match");
    this.modalRating = document.getElementById("modal-rating");
    this.modalDate = document.getElementById("modal-date");
    this.modalGenres = document.getElementById("modal-genres");
    this.modalOverview = document.getElementById("modal-overview");
    this.modalKeywords = document.getElementById("modal-keywords");
    this.modalAddBtn = document.getElementById("modal-add-btn");
    this.activeModalMovie = null;

    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.populateGenreFilter();
    
    // Train TF-IDF engine on initial corpus
    this.retrainEngine();

    // Default select 2 popular movies to give an immediate preview
    const defaultIds = [27205, 414906, 687163]; // Inception, The Batman, Project Hail Mary
    defaultIds.forEach(id => {
      const movie = this.moviesCorpus.find(m => m.id === id);
      if (movie) this.selectedMovies.push(movie);
    });

    this.renderQuickChips();
    this.renderSelectedMovies();
    this.runAnalysisAndRecommend();

    // Fetch live TMDB trending movies in background to expand corpus!
    this.fetchLiveTMDBTrending();
  }

  retrainEngine() {
    this.engine.fitTransform(this.moviesCorpus);
    this.statMoviesCount.textContent = this.moviesCorpus.length;
    this.statVocabCount.textContent = this.engine.vocabulary.length;
  }

  async fetchLiveTMDBTrending() {
    try {
      const res = await fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}&page=1`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.results || !data.results.length) return;

      const existingIds = new Set(this.moviesCorpus.map(m => m.id));
      let addedNew = false;

      data.results.forEach(m => {
        if (!existingIds.has(m.id)) {
          this.moviesCorpus.push({
            id: m.id,
            title: m.title || m.original_title,
            original_title: m.original_title,
            overview: m.overview || "",
            poster_path: m.poster_path ? (m.poster_path.startsWith("http") ? m.poster_path : `${TMDB_IMAGE_BASE}${m.poster_path}`) : "https://via.placeholder.com/500x750?text=No+Poster",
            backdrop_path: m.backdrop_path ? (m.backdrop_path.startsWith("http") ? m.backdrop_path : `${TMDB_BACKDROP_BASE}${m.backdrop_path}`) : "",
            genre_ids: m.genre_ids || [],
            vote_average: m.vote_average || 0,
            vote_count: m.vote_count || 0,
            release_date: m.release_date || ""
          });
          addedNew = true;
        }
      });

      if (addedNew) {
        this.retrainEngine();
        this.renderQuickChips();
        this.runAnalysisAndRecommend();
      }
    } catch (e) {
      console.log("TMDB live fetch fallback to local corpus:", e);
    }
  }

  setupEventListeners() {
    // Search Autocomplete
    this.searchInput.addEventListener("input", (e) => this.handleSearchInput(e.target.value));
    
    document.addEventListener("click", (e) => {
      if (!this.searchInput.contains(e.target) && !this.autocompleteDropdown.contains(e.target)) {
        this.autocompleteDropdown.style.display = "none";
      }
    });

    // Actions
    this.btnClearAll.addEventListener("click", () => {
      this.selectedMovies = [];
      this.renderSelectedMovies();
      this.renderQuickChips();
      this.runAnalysisAndRecommend();
    });

    this.btnAnalyze.addEventListener("click", () => {
      this.runAnalysisAndRecommend();
    });

    this.btnExportDna.addEventListener("click", () => {
      this.exportDnaReport();
    });

    // Sort & Filter
    this.sortSelect.addEventListener("change", () => this.renderRecommendations());
    this.genreFilterSelect.addEventListener("change", () => this.renderRecommendations());

    // Modal close
    this.modalCloseBtn.addEventListener("click", () => {
      this.modal.style.display = "none";
    });
    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) this.modal.style.display = "none";
    });

    this.modalAddBtn.addEventListener("click", () => {
      if (this.activeModalMovie) {
        this.addMovieToSelected(this.activeModalMovie);
        this.modal.style.display = "none";
      }
    });
  }

  populateGenreFilter() {
    this.genreFilterSelect.innerHTML = '<option value="all">All Genres</option>';
    Object.entries(GENRE_MAP).forEach(([id, name]) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = name;
      this.genreFilterSelect.appendChild(opt);
    });
  }

  handleSearchInput(query) {
    const q = query.trim().toLowerCase();
    if (q.length < 2) {
      this.autocompleteDropdown.style.display = "none";
      return;
    }

    const matches = this.moviesCorpus.filter(m => 
      m.title.toLowerCase().includes(q) || (m.overview && m.overview.toLowerCase().includes(q))
    ).slice(0, 8);

    if (matches.length === 0) {
      this.autocompleteDropdown.innerHTML = `<div class="autocomplete-item" style="color: var(--text-muted);">No movies found matching "${query}"</div>`;
    } else {
      this.autocompleteDropdown.innerHTML = matches.map(m => `
        <div class="autocomplete-item" data-id="${m.id}">
          <img src="${m.poster_path}" class="autocomplete-thumb" alt="${m.title}" onerror="this.src='https://via.placeholder.com/100x150?text=Movie'">
          <div>
            <div class="autocomplete-title">${m.title}</div>
            <div class="autocomplete-meta">${m.release_date ? m.release_date.split('-')[0] : ''} • ★ ${m.vote_average.toFixed(1)}</div>
          </div>
        </div>
      `).join("");

      // Add click listener
      const items = this.autocompleteDropdown.querySelectorAll(".autocomplete-item");
      items.forEach(item => {
        item.addEventListener("click", () => {
          const movieId = parseInt(item.getAttribute("data-id"));
          const movie = this.moviesCorpus.find(m => m.id === movieId);
          if (movie) {
            this.addMovieToSelected(movie);
            this.searchInput.value = "";
            this.autocompleteDropdown.style.display = "none";
          }
        });
      });
    }

    this.autocompleteDropdown.style.display = "block";
  }

  renderQuickChips() {
    const popularTitles = ["Avatar", "Inception", "The Batman", "Dune", "Interstellar", "Oppenheimer", "The Dark Knight", "Project Hail Mary"];
    
    this.quickChipsContainer.innerHTML = popularTitles.map(title => {
      const movie = this.moviesCorpus.find(m => m.title.toLowerCase() === title.toLowerCase());
      if (!movie) return "";

      const isSelected = this.selectedMovies.some(sm => sm.id === movie.id);
      return `
        <button class="chip-btn ${isSelected ? 'selected' : ''}" data-id="${movie.id}">
          <i class="fa-solid ${isSelected ? 'fa-check' : 'fa-plus'}"></i> ${movie.title}
        </button>
      `;
    }).join("");

    const chips = this.quickChipsContainer.querySelectorAll(".chip-btn");
    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        const id = parseInt(chip.getAttribute("data-id"));
        const movie = this.moviesCorpus.find(m => m.id === id);
        if (movie) {
          if (this.selectedMovies.some(sm => sm.id === movie.id)) {
            this.removeMovieFromSelected(movie.id);
          } else {
            this.addMovieToSelected(movie);
          }
        }
      });
    });
  }

  addMovieToSelected(movie) {
    if (!this.selectedMovies.some(sm => sm.id === movie.id)) {
      this.selectedMovies.push(movie);
      this.renderSelectedMovies();
      this.renderQuickChips();
      this.runAnalysisAndRecommend();
    }
  }

  removeMovieFromSelected(id) {
    this.selectedMovies = this.selectedMovies.filter(m => m.id !== id);
    this.renderSelectedMovies();
    this.renderQuickChips();
    this.runAnalysisAndRecommend();
  }

  renderSelectedMovies() {
    this.selectedCount.textContent = this.selectedMovies.length;
    
    if (this.selectedMovies.length === 0) {
      this.selectedGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: var(--text-muted); background: rgba(255,255,255,0.02); border-radius: var(--radius-md); border: 1px dashed var(--glass-border);">
          <i class="fa-solid fa-film" style="font-size: 1.5rem; margin-bottom: 8px; color: var(--primary-cyan);"></i>
          <div>No movies selected. Search or click quick chips above to add movies you love!</div>
        </div>
      `;
      return;
    }

    this.selectedGrid.innerHTML = this.selectedMovies.map(m => `
      <div class="selected-card">
        <img src="${m.poster_path}" class="selected-poster" alt="${m.title}" onerror="this.src='https://via.placeholder.com/100x150?text=Poster'">
        <div class="selected-info">
          <div class="selected-name" title="${m.title}">${m.title}</div>
          <div class="selected-year">${m.release_date ? m.release_date.split('-')[0] : 'N/A'}</div>
        </div>
        <button class="btn-remove-selected" data-id="${m.id}" title="Remove">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `).join("");

    const removeBtns = this.selectedGrid.querySelectorAll(".btn-remove-selected");
    removeBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = parseInt(btn.getAttribute("data-id"));
        this.removeMovieFromSelected(id);
      });
    });
  }

  runAnalysisAndRecommend() {
    if (this.selectedMovies.length === 0) {
      this.analyticsSection.style.display = "none";
      this.recommendationsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <i class="fa-solid fa-dna" style="font-size: 2.5rem; color: var(--primary-cyan); margin-bottom: 16px;"></i>
          <h3>Please add at least 1 movie to your favorites list.</h3>
          <p>MovieDNA will vector analysis plot themes and compute Cosine Similarity recommendations.</p>
        </div>
      `;
      return;
    }

    const selectedIds = this.selectedMovies.map(m => m.id);
    const result = this.engine.recommend(selectedIds, 12);
    this.currentResults = result;

    this.renderAnalytics(result);
    this.renderRecommendations();
  }

  renderAnalytics(result) {
    this.analyticsSection.style.display = "block";

    // 1. Top Keywords
    if (!result.blendedKeywords || result.blendedKeywords.length === 0) {
      this.keywordsContainer.innerHTML = '<span style="color: var(--text-muted);">No distinct keywords extracted.</span>';
    } else {
      this.keywordsContainer.innerHTML = result.blendedKeywords.map(k => `
        <div class="keyword-pill">
          <span>${k.term}</span>
          <span class="keyword-score">${(k.weight * 100).toFixed(1)}</span>
        </div>
      `).join("");
    }

    // 2. Genre Distribution
    const genreCounts = {};
    let totalGenres = 0;

    this.selectedMovies.forEach(m => {
      (m.genre_ids || []).forEach(gId => {
        const name = GENRE_MAP[gId] || "Other";
        genreCounts[name] = (genreCounts[name] || 0) + 1;
        totalGenres++;
      });
    });

    const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);

    if (sortedGenres.length === 0) {
      this.genreBarsContainer.innerHTML = '<span style="color: var(--text-muted);">No genres available.</span>';
    } else {
      this.genreBarsContainer.innerHTML = sortedGenres.map(([genre, count]) => {
        const pct = Math.round((count / totalGenres) * 100);
        return `
          <div class="genre-bar-item">
            <div class="genre-label-row">
              <span>${genre}</span>
              <span>${pct}% (${count})</span>
            </div>
            <div class="genre-bar-track">
              <div class="genre-bar-fill" style="width: ${pct}%;"></div>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  renderRecommendations() {
    if (!this.currentResults || !this.currentResults.recommendations) return;

    let recs = [...this.currentResults.recommendations];

    // Genre filter
    const selectedGenreId = this.genreFilterSelect.value;
    if (selectedGenreId !== "all") {
      const genreIdNum = parseInt(selectedGenreId);
      recs = recs.filter(item => (item.movie.genre_ids || []).includes(genreIdNum));
    }

    // Sorting
    const sortVal = this.sortSelect.value;
    if (sortVal === "match") {
      recs.sort((a, b) => b.similarity - a.similarity);
    } else if (sortVal === "rating") {
      recs.sort((a, b) => b.movie.vote_average - a.movie.vote_average);
    } else if (sortVal === "date") {
      recs.sort((a, b) => (b.movie.release_date || "").localeCompare(a.movie.release_date || ""));
    }

    this.resultsSubtitle.textContent = `Calculated predictions based on common features of ${this.selectedMovies.length} selected movie(s).`;

    if (recs.length === 0) {
      this.recommendationsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
          No recommended movies match the selected genre filter.
        </div>
      `;
      return;
    }

    this.recommendationsGrid.innerHTML = recs.map(item => {
      const m = item.movie;
      const genreBadgeHtml = (m.genre_ids || []).slice(0, 3).map(gId => `
        <span class="genre-tag">${GENRE_MAP[gId] || 'Film'}</span>
      `).join("");

      const sharedKwHtml = item.topSharedKeywords && item.topSharedKeywords.length ? 
        `Shared DNA: <strong>${item.topSharedKeywords.join(", ")}</strong>` : 
        `High vector correlation score in overview plot.`;

      return `
        <div class="movie-card" data-id="${m.id}">
          <div class="card-poster-wrapper">
            <img src="${m.poster_path}" class="card-poster" alt="${m.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/500x750?text=Poster'">
            <div class="match-badge">${item.matchPercentage}% MATCH</div>
          </div>
          
          <div class="card-body">
            <div class="card-title">${m.title}</div>
            
            <div class="card-meta">
              <span class="rating-star"><i class="fa-solid fa-star"></i> ${m.vote_average.toFixed(1)}</span>
              <span>${m.release_date ? m.release_date.split('-')[0] : 'N/A'}</span>
            </div>

            <div class="genre-tags">${genreBadgeHtml}</div>

            <div class="why-recommended">
              ${sharedKwHtml}
            </div>

            <div class="card-actions">
              <button class="btn-card-action btn-view-details" data-id="${m.id}">
                <i class="fa-solid fa-circle-info"></i> Details
              </button>
              <button class="btn-card-action btn-add-favorite" data-id="${m.id}" style="background: rgba(0, 243, 255, 0.1); border-color: rgba(0, 243, 255, 0.3);">
                <i class="fa-solid fa-plus"></i> Re-blend
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    // Setup action handlers
    const detailBtns = this.recommendationsGrid.querySelectorAll(".btn-view-details");
    detailBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.getAttribute("data-id"));
        this.openModal(id);
      });
    });

    const addBtns = this.recommendationsGrid.querySelectorAll(".btn-add-favorite");
    addBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.getAttribute("data-id"));
        const movie = this.moviesCorpus.find(m => m.id === id);
        if (movie) this.addMovieToSelected(movie);
      });
    });
  }

  openModal(movieId) {
    const recItem = (this.currentResults && this.currentResults.recommendations) ? 
      this.currentResults.recommendations.find(r => r.movie.id === movieId) : null;
    
    const movie = this.moviesCorpus.find(m => m.id === movieId);
    if (!movie) return;

    this.activeModalMovie = movie;
    this.modalTitle.textContent = movie.title;
    this.modalBanner.src = movie.backdrop_path || movie.poster_path;
    this.modalOverview.textContent = movie.overview || "No overview available.";
    this.modalRating.innerHTML = `<i class="fa-solid fa-star"></i> ${movie.vote_average.toFixed(1)} (${movie.vote_count} votes)`;
    this.modalDate.textContent = movie.release_date || "Release date N/A";
    this.modalMatch.textContent = recItem ? `${recItem.matchPercentage}% DNA MATCH` : `MOVIE DNA ITEM`;

    this.modalGenres.innerHTML = (movie.genre_ids || []).map(gId => `
      <span class="genre-tag" style="padding: 6px 12px; font-size: 0.8rem;">${GENRE_MAP[gId] || 'Movie'}</span>
    `).join("");

    // Keywords extracted specifically for this movie
    const tokens = this.engine.tokenize(this.engine.getMovieSoup(movie));
    const uniqueTokens = [...new Set(tokens)].slice(0, 8);
    
    this.modalKeywords.innerHTML = uniqueTokens.map(term => `
      <div class="keyword-pill" style="font-size: 0.8rem;">
        <span>${term}</span>
      </div>
    `).join("");

    this.modal.style.display = "flex";
  }

  exportDnaReport() {
    if (!this.currentResults) return;

    const report = {
      timestamp: new Date().toISOString(),
      favoriteMovies: this.selectedMovies.map(m => m.title),
      blendedProfileKeywords: this.currentResults.blendedKeywords,
      recommendations: this.currentResults.recommendations.map(r => ({
        title: r.movie.title,
        matchPercentage: r.matchPercentage,
        rating: r.movie.vote_average,
        topSharedKeywords: r.topSharedKeywords
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "MovieDNA_Taste_Profile.json";
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Instantiate App when DOM ready
document.addEventListener("DOMContentLoaded", () => {
  window.app = new MovieDNAApp();
});
