import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import "./App.css";
import { mockProducts } from "./mockProducts";



function expensiveCalculation(products, filter, sort) {
  console.log("⚠️ Komputasi berat berjalan...");

  // Dummy computation removed

  let result = [...products];

  if (filter === "expensive") {
    result = result.filter((product) => product.price > 100);
  }

  if (filter === "cheap") {
    result = result.filter((product) => product.price <= 100);
  }

  if (sort === "price-asc") {
    result.sort((a, b) => a.price - b.price);
  }

  if (sort === "price-desc") {
    result.sort((a, b) => b.price - a.price);
  }

  if (sort === "title-asc") {
    result.sort((a, b) => a.title.localeCompare(b.title));
  }

  return result;
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

function shortenText(text, maxLength = 80) {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function useProducts(simulateNetworkError) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Use mock product data for makeup theme
      setProducts(mockProducts);
      // Simulated network error handling retained
      if (simulateNetworkError) {
        setError("Simulated network error");
      }
    } catch (err) {
      setProducts([]);
      setError(err.message || "Terjadi kesalahan saat mengambil data");
    } finally {
      setLoading(false);
    }
  }, [simulateNetworkError]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    retry: fetchProducts,
  };
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
    };

    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error Boundary menangkap error:", error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({
        hasError: false,
        error: null,
      });
    }
  }

  handleRetry() {
    this.setState({
      hasError: false,
      error: null,
    });

    if (this.props.onRetry) {
      this.props.onRetry();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>⚠️ Terjadi Kesalahan pada UI</h2>
          <p>Komponen gagal ditampilkan. Klik tombol di bawah untuk mencoba lagi.</p>

          <pre>
            {this.state.error ? this.state.error.toString() : "Unknown error"}
          </pre>

          <button className="btn danger" onClick={this.handleRetry}>
            Coba Lagi
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function SkeletonLoader() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-image"></div>
      <div className="skeleton skeleton-title"></div>
      <div className="skeleton skeleton-text"></div>
      <div className="skeleton skeleton-price"></div>
    </div>
  );
}

const FilterBar = React.memo(function FilterBar({
  filter,
  sort,
  onFilterChange,
  onSortChange,
  isPending,
}) {
  console.log("FilterBar render");

  return (
    <section className="filter-bar">
      <div>
        <h2>Filter Produk</h2>
        <p>Pilih kategori harga dan urutan produk.</p>
      </div>

      <div className="filter-actions">
        <div className="filter-buttons">
          <button
            className={filter === "all" ? "filter-btn active" : "filter-btn"}
            onClick={() => onFilterChange("all")}
          >
            Semua
          </button>

          <button
            className={
              filter === "expensive" ? "filter-btn active" : "filter-btn"
            }
            onClick={() => onFilterChange("expensive")}
          >
            Mahal &gt; $100
          </button>

          <button
            className={filter === "cheap" ? "filter-btn active" : "filter-btn"}
            onClick={() => onFilterChange("cheap")}
          >
            Murah ≤ $100
          </button>
        </div>

        <select value={sort} onChange={(e) => onSortChange(e.target.value)}>
          <option value="default">Urutan Default</option>
          <option value="price-asc">Harga Termurah</option>
          <option value="price-desc">Harga Termahal</option>
          <option value="title-asc">Nama A-Z</option>
        </select>

        {isPending && <span className="pending-badge">Memproses...</span>}
      </div>
    </section>
  );
});

function ProductDetail({ productId }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `https://fakestoreapi.com/products/${productId}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - Detail gagal dimuat`);
      }

      const data = await response.json();
      setDetail(data);
    } catch (err) {
      setError(err.message || "Gagal memuat detail produk");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return <div className="detail-box">Loading detail...</div>;
  }

  if (error) {
    return (
      <div className="detail-box error-inline">
        <p>Gagal load detail: {error}</p>
        <button className="btn small" onClick={fetchDetail}>
          Retry
        </button>
      </div>
    );
  }

  if (!detail) return null;

  return (
    <div className="detail-box">
      <strong>Detail Produk:</strong>
      <p>{shortenText(detail.description, 130)}</p>
    </div>
  );
}

const ProductItem = React.memo(function ProductItem({ product, simulateError }) {
  console.log(`ProductItem ${product.id} render`);

  const [showDetail, setShowDetail] = useState(false);

  if (simulateError && product.price > 200) {
    throw new Error("Simulasi error untuk produk mahal!");
  }

  return (
    <article className="product-card">
      <div className="product-image-wrapper">
        <img className="product-image" src={product.image} alt={product.title} />
      </div>

      <div className="product-content">
        <span className="category">{product.category}</span>

        <h3>{shortenText(product.title, 45)}</h3>

        <p className="product-description">
          {shortenText(product.description, 90)}
        </p>

        <div className="product-footer">
          <strong>{formatPrice(product.price)}</strong>

          <button
            className="btn small"
            onClick={() => setShowDetail((prev) => !prev)}
          >
            {showDetail ? "Tutup Detail" : "Lihat Detail"}
          </button>
        </div>

        {showDetail && <ProductDetail productId={product.id} />}
      </div>
    </article>
  );
});

const ProductList = React.memo(function ProductList({ products, simulateError }) {
  console.log("ProductList render");

  if (!products || products.length === 0) {
    return (
      <div className="empty-state">
        <h3>Produk tidak ditemukan</h3>
        <p>Coba ubah filter atau sorting produk.</p>
      </div>
    );
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductItem
          key={product.id}
          product={product}
          simulateError={simulateError}
        />
      ))}
    </div>
  );
});

function App() {
  const [simulateNetworkError, setSimulateNetworkError] = useState(false);
  const [simulateRenderError, setSimulateRenderError] = useState(false);
  const [errorBoundaryResetKey, setErrorBoundaryResetKey] = useState(0);

  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("default");

  const [isPending, startTransition] = useTransition();

  const { products, loading, error, retry } =
    useProducts(simulateNetworkError);

  const handleFilterChange = useCallback((newFilter) => {
    startTransition(() => {
      setFilter(newFilter);
    });
  }, []);

  const handleSortChange = useCallback((newSort) => {
    startTransition(() => {
      setSort(newSort);
    });
  }, []);

  const handleRecoverUI = useCallback(() => {
    setSimulateRenderError(false);
    setErrorBoundaryResetKey((prev) => prev + 1);
  }, []);

  const filteredProducts = useMemo(() => {
    console.log("Menjalankan expensiveCalculation dengan useMemo");
    return expensiveCalculation(products, filter, sort);
  }, [products, filter, sort]);

  if (loading) {
    return (
      <main className="app-shell">
        <section className="status-card">
          <h1>Product Dashboard</h1>
          <p>Sedang mengambil data produk...</p>

          <div className="product-grid">
            <SkeletonLoader />
            <SkeletonLoader />
            <SkeletonLoader />
            <SkeletonLoader />
          </div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="app-shell">
        <section className="status-card error-card">
          <h1>Async Error Tertangkap</h1>
          <p>{error}</p>

          <div className="button-group">
            <button className="btn primary" onClick={retry}>
              Retry
            </button>

            <button
              className="btn"
              onClick={() => setSimulateNetworkError(false)}
            >
              Matikan Error API
            </button>
          </div>

          <p className="hint">
            Ini simulasi network error dari tugas modul. Error API ditangkap
            memakai try/catch dan state lokal.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">React Optimization Practice</p>
          <h1>Product Dashboard</h1>
          <p>
            Dashboard produk dengan optimasi UI, Error Boundary, async error
            handling, retry mechanism, React.memo, useMemo, dan useTransition.
          </p>
        </div>

        <div className="hero-actions">
          <button
            className={
              simulateNetworkError ? "btn warning active" : "btn warning"
            }
            onClick={() => setSimulateNetworkError((prev) => !prev)}
          >
            Simulasi Network Error
          </button>

          <button
            className={simulateRenderError ? "btn danger active" : "btn danger"}
            onClick={() => setSimulateRenderError(true)}
          >
            Simulasi Render Error
          </button>
        </div>
      </header>

      <FilterBar
        filter={filter}
        sort={sort}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        isPending={isPending}
      />

      <section className="summary">
        <div>
          <span>Total Produk</span>
          <strong>{products.length}</strong>
        </div>

        <div>
          <span>Produk Ditampilkan</span>
          <strong>{filteredProducts.length}</strong>
        </div>

        <div>
          <span>Filter Aktif</span>
          <strong>{filter}</strong>
        </div>
      </section>

      <ErrorBoundary
        resetKey={errorBoundaryResetKey}
        onRetry={handleRecoverUI}
      >
        <ProductList
          products={filteredProducts}
          simulateError={simulateRenderError}
        />
      </ErrorBoundary>
    </main>
  );
}

export default App;