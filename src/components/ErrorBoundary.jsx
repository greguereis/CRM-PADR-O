import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('🔴 ERRO CAPTURADO PELO ErrorBoundary:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }))
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 max-w-lg w-full shadow-lg">
            {/* Ícone */}
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-[var(--text-primary)] text-center mb-2">
              ⚠️ Algo deu errado
            </h2>
            
            <p className="text-sm text-[var(--text-secondary)] text-center mb-6">
              Ocorreu um erro inesperado. Tente recarregar a página ou voltar para o início.
            </p>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 text-sm rounded-lg bg-[#D2B68A] text-[#222D52] hover:bg-[#C4A67A] transition-colors font-medium"
              >
                🔄 Recarregar Página
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 py-2.5 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                🏠 Voltar ao Início
              </button>
            </div>

            {/* Detalhes do Erro (colapsável) */}
            <button
              onClick={this.toggleDetails}
              className="w-full text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-center gap-1"
            >
              {this.state.showDetails ? '▲ Ocultar detalhes' : '▼ Ver detalhes do erro'}
            </button>

            {this.state.showDetails && (
              <details className="mt-3 bg-[var(--bg-tertiary)] p-3 rounded-lg border border-[var(--border-color)]">
                <summary className="cursor-pointer text-xs text-[var(--text-secondary)] font-medium">
                  Detalhes Técnicos
                </summary>
                <div className="mt-2">
                  <p className="text-xs font-mono text-red-500 break-all">
                    {this.state.error?.toString() || 'Erro desconhecido'}
                  </p>
                  {this.state.errorInfo?.componentStack && (
                    <div className="mt-2">
                      <p className="text-[10px] text-[var(--text-muted)] font-semibold mb-1">Stack Trace:</p>
                      <pre className="text-[10px] text-[var(--text-secondary)] whitespace-pre-wrap overflow-auto max-h-40 bg-[var(--bg-secondary)] p-2 rounded">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <p className="text-[10px] text-[var(--text-secondary)] text-center mt-4">
              Se o erro persistir, entre em contato com o suporte.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary