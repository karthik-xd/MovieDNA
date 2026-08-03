/**
 * MovieDNA - Native JavaScript TF-IDF Vectorizer & Cosine Similarity Engine
 * Replicates scikit-learn TfidfVectorizer & cosine_similarity from MovieDNA.ipynb
 */

const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at",
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
  "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from",
  "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
  "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in",
  "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no",
  "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over",
  "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that",
  "that's", "the", "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll",
  "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we",
  "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
  "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're",
  "you've", "your", "yours", "yourself", "yourselves"
]);

class MovieDNAEngine {
  constructor(movies = []) {
    this.movies = movies;
    this.vocabulary = [];       // Array of unique terms
    this.termToIndex = {};      // Map term -> index
    this.idf = [];              // IDF values array
    this.tfidfMatrix = [];      // 2D Array [movieIndex][termIndex] normalized
    this.isTrained = false;
  }

  cleanText(text) {
    if (!text) return "";
    return String(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  getMovieSoup(movie) {
    // Combine overview + genre names (repeated twice for genre emphasis)
    const overviewClean = this.cleanText(movie.overview || "");
    const genreNames = (movie.genre_ids || [])
      .map(id => GENRE_MAP[id] || "")
      .filter(Boolean)
      .join(" ");
    const genreClean = this.cleanText(genreNames);
    
    // Add title tokens as well to help exact text alignment
    const titleClean = this.cleanText(movie.title || "");

    return `${overviewClean} ${genreClean} ${genreClean} ${titleClean}`;
  }

  tokenize(text) {
    const cleaned = this.cleanText(text);
    if (!cleaned) return [];
    return cleaned
      .split(" ")
      .filter(word => word.length > 2 && !STOP_WORDS.has(word));
  }

  fitTransform(movies) {
    this.movies = movies;
    const numDocs = movies.length;
    if (numDocs === 0) return;

    // Step 1: Tokenize all documents and build vocabulary & Document Frequencies (DF)
    const docTokens = [];
    const dfMap = {};

    for (let i = 0; i < numDocs; i++) {
      const soup = this.getMovieSoup(movies[i]);
      const tokens = this.tokenize(soup);
      docTokens.push(tokens);

      const uniqueTokensInDoc = new Set(tokens);
      uniqueTokensInDoc.forEach(term => {
        dfMap[term] = (dfMap[term] || 0) + 1;
      });
    }

    // Vocabulary sorted alphabetically for deterministic results
    this.vocabulary = Object.keys(dfMap).sort();
    this.termToIndex = {};
    this.vocabulary.forEach((term, idx) => {
      this.termToIndex[term] = idx;
    });

    const vocabSize = this.vocabulary.length;

    // Step 2: Compute IDF (smooth_idf = True: log((1 + N) / (1 + df)) + 1)
    this.idf = new Array(vocabSize);
    for (let i = 0; i < vocabSize; i++) {
      const term = this.vocabulary[i];
      const df = dfMap[term] || 0;
      this.idf[i] = Math.log((1 + numDocs) / (1 + df)) + 1;
    }

    // Step 3: Compute TF-IDF matrix for each document with L2 normalization
    this.tfidfMatrix = new Array(numDocs);

    for (let d = 0; d < numDocs; d++) {
      const tokens = docTokens[d];
      const docVector = new Array(vocabSize).fill(0);
      
      // Calculate Term Frequencies (TF)
      const tfMap = {};
      tokens.forEach(term => {
        tfMap[term] = (tfMap[term] || 0) + 1;
      });

      // TF-IDF = TF * IDF
      let normSq = 0;
      for (const term in tfMap) {
        const termIdx = this.termToIndex[term];
        if (termIdx !== undefined) {
          const tf = tfMap[term];
          const tfidfVal = tf * this.idf[termIdx];
          docVector[termIdx] = tfidfVal;
          normSq += tfidfVal * tfidfVal;
        }
      }

      // L2 Normalization
      const norm = Math.sqrt(normSq);
      if (norm > 0) {
        for (let i = 0; i < vocabSize; i++) {
          docVector[i] /= norm;
        }
      }

      this.tfidfMatrix[d] = docVector;
    }

    this.isTrained = true;
    return this.tfidfMatrix;
  }

  /**
   * Recommends top N movies given an array of target movie IDs or indices
   */
  recommend(selectedMovieIds, topN = 6) {
    if (!this.isTrained || this.movies.length === 0) {
      return { recommendations: [], blendedProfile: {}, missingMovies: [] };
    }

    const vocabSize = this.vocabulary.length;
    const selectedIndices = [];
    const missingMovies = [];

    // Find indices for selected movie IDs
    selectedMovieIds.forEach(id => {
      const idx = this.movies.findIndex(m => String(m.id) === String(id));
      if (idx !== -1) {
        selectedIndices.push(idx);
      } else {
        missingMovies.push(id);
      }
    });

    if (selectedIndices.length === 0) {
      return { recommendations: [], blendedProfile: {}, missingMovies };
    }

    // Calculate Blended Ideal Taste Profile Vector (average vector across selected movies)
    const blendedVector = new Array(vocabSize).fill(0);
    selectedIndices.forEach(docIdx => {
      const vec = this.tfidfMatrix[docIdx];
      for (let i = 0; i < vocabSize; i++) {
        blendedVector[i] += vec[i];
      }
    });

    for (let i = 0; i < vocabSize; i++) {
      blendedVector[i] /= selectedIndices.length;
    }

    // Normalize blended vector
    let blendedNormSq = 0;
    for (let i = 0; i < vocabSize; i++) {
      blendedNormSq += blendedVector[i] * blendedVector[i];
    }
    const blendedNorm = Math.sqrt(blendedNormSq);
    if (blendedNorm > 0) {
      for (let i = 0; i < vocabSize; i++) {
        blendedVector[i] /= blendedNorm;
      }
    }

    // Compute Cosine Similarity between blended vector and all movies in corpus
    // Cosine Sim = dot_product(u, v) because u and v are L2 normalized
    const similarityScores = [];
    for (let d = 0; d < this.movies.length; d++) {
      const isAlreadySelected = selectedIndices.includes(d);
      if (isAlreadySelected) continue;

      const vec = this.tfidfMatrix[d];
      let dotProduct = 0;
      for (let i = 0; i < vocabSize; i++) {
        dotProduct += blendedVector[i] * vec[i];
      }

      similarityScores.push({
        movieIndex: d,
        movie: this.movies[d],
        similarity: dotProduct,
        matchPercentage: Math.min(99, Math.max(15, Math.round(dotProduct * 100)))
      });
    }

    // Sort by Cosine Similarity descending
    similarityScores.sort((a, b) => b.similarity - a.similarity);

    const topRecommendations = similarityScores.slice(0, topN).map(item => {
      // Find shared top TF-IDF keywords between blended profile and this movie
      const movieVec = this.tfidfMatrix[item.movieIndex];
      const sharedTerms = [];

      for (let i = 0; i < vocabSize; i++) {
        if (blendedVector[i] > 0.01 && movieVec[i] > 0.01) {
          sharedTerms.push({
            term: this.vocabulary[i],
            score: blendedVector[i] * movieVec[i]
          });
        }
      }

      sharedTerms.sort((a, b) => b.score - a.score);

      return {
        ...item,
        topSharedKeywords: sharedTerms.slice(0, 5).map(t => t.term)
      };
    });

    // Extract top TF-IDF keywords for the blended taste profile overall
    const profileTerms = [];
    for (let i = 0; i < vocabSize; i++) {
      if (blendedVector[i] > 0) {
        profileTerms.push({
          term: this.vocabulary[i],
          weight: blendedVector[i]
        });
      }
    }
    profileTerms.sort((a, b) => b.weight - a.weight);

    return {
      recommendations: topRecommendations,
      blendedKeywords: profileTerms.slice(0, 12),
      selectedIndices,
      missingMovies
    };
  }
}
