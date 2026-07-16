import { useState } from 'react'
import { Folder, FolderPlus, X, Trash2, Pencil, Check, Loader2 } from 'lucide-react'
import { useListas } from '../../hooks/useListas'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function ListaSelector({ 
  listaSelecionada, 
  onSelectLista,
  onListaCriada,
  mostrarTodas = true,
  className = '',
  tamanho = 'md' // sm, md, lg
}) {
  const { user } = useAuth()
  const { listas, loading, criarLista, renomearLista, excluirLista } = useListas()
  const [showCriar, setShowCriar] = useState(false)
  const [novaListaNome, setNovaListaNome] = useState('')
  const [criando, setCriando] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [editandoNome, setEditandoNome] = useState('')
  
  const isAdmin = user?.email === 'closermatheus@gmail.com'

  const handleCriarLista = async () => {
    if (!novaListaNome.trim()) {
      toast.error('Digite um nome para a lista')
      return
    }
    
    setCriando(true)
    try {
      const novaLista = await criarLista(novaListaNome)
      if (novaLista) {
        setNovaListaNome('')
        setShowCriar(false)
        if (onListaCriada) onListaCriada(novaLista)
        if (onSelectLista) onSelectLista(novaLista.id)
        toast.success(`Lista "${novaLista.nome}" criada!`)
      }
    } finally {
      setCriando(false)
    }
  }

  const iniciarEdicao = (lista, e) => {
    e.stopPropagation()
    setEditandoId(lista.id)
    setEditandoNome(lista.nome)
  }

  const salvarEdicao = async (listaId) => {
    if (!editandoNome.trim()) {
      toast.error('Digite um nome válido')
      return
    }
    
    const sucesso = await renomearLista(listaId, editandoNome)
    if (sucesso) {
      setEditandoId(null)
      setEditandoNome('')
    }
  }

  const cancelarEdicao = () => {
    setEditandoId(null)
    setEditandoNome('')
  }

  const handleExcluirLista = async (listaId, e) => {
    e.stopPropagation()
    if (!confirm('Tem certeza que deseja excluir esta lista? Os contatos não serão deletados.')) return
    
    const sucesso = await excluirLista(listaId)
    if (sucesso && listaSelecionada === listaId) {
      if (onSelectLista) onSelectLista(null)
    }
  }

  const listasArray = Array.isArray(listas) ? listas : []

  // Tamanhos
  const tamanhos = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  }

  const tamanhoClasses = tamanhos[tamanho] || tamanhos.md

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className={`h-10 bg-[var(--bg-tertiary)] rounded-lg ${className}`}></div>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className={`font-medium text-[var(--text-primary)] ${tamanho === 'sm' ? 'text-xs' : 'text-sm'}`}>
          <Folder size={tamanho === 'sm' ? 14 : 16} className="inline mr-1.5 text-[#D2B68A]" />
          Listas
        </label>
        <button
          onClick={() => setShowCriar(!showCriar)}
          className={`text-[#D2B68A] hover:text-[#C4A67A] flex items-center gap-1 transition-colors ${
            tamanho === 'sm' ? 'text-[10px]' : 'text-xs'
          }`}
        >
          <FolderPlus size={tamanho === 'sm' ? 12 : 14} />
          Nova Lista
        </button>
      </div>

      {showCriar && (
        <div className="flex gap-2 bg-[var(--bg-tertiary)] p-3 rounded-lg">
          <input
            type="text"
            value={novaListaNome}
            onChange={(e) => setNovaListaNome(e.target.value)}
            placeholder="Nome da lista"
            className="flex-1 px-3 py-1.5 bg-[var(--bg-secondary)] rounded-lg text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:border-[#D2B68A] outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleCriarLista()}
            autoFocus
            disabled={criando}
          />
          <button
            onClick={handleCriarLista}
            disabled={criando || !novaListaNome.trim()}
            className="bg-[#D2B68A] text-[#222D52] px-4 py-1.5 rounded-lg text-sm hover:bg-[#C4A67A] transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            {criando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Criar
          </button>
          <button
            onClick={() => setShowCriar(false)}
            className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg text-[var(--text-secondary)]"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {mostrarTodas && (
          <button
            onClick={() => onSelectLista && onSelectLista(null)}
            className={`
              ${tamanhoClasses} rounded-lg font-medium transition-all border
              ${!listaSelecionada 
                ? 'bg-[#D2B68A] text-[#222D52] border-[#D2B68A]' 
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border-transparent hover:border-[var(--border-color)]'
              }
            `}
          >
            📋 Todos
          </button>
        )}

        {listasArray.map((lista) => (
          <div key={lista.id} className="relative group">
            {editandoId === lista.id ? (
              <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] rounded-lg px-2 py-1">
                <input
                  type="text"
                  value={editandoNome}
                  onChange={(e) => setEditandoNome(e.target.value)}
                  className={`px-2 py-0.5 bg-[var(--bg-secondary)] rounded text-sm text-[var(--text-primary)] border border-[#D2B68A] outline-none w-28 ${tamanhoClasses}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') salvarEdicao(lista.id)
                    if (e.key === 'Escape') cancelarEdicao()
                  }}
                  autoFocus
                />
                <button
                  onClick={() => salvarEdicao(lista.id)}
                  className="p-0.5 hover:bg-[var(--bg-secondary)] rounded text-green-500"
                  title="Salvar"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={cancelarEdicao}
                  className="p-0.5 hover:bg-[var(--bg-secondary)] rounded text-red-500"
                  title="Cancelar"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onSelectLista && onSelectLista(lista.id)}
                className={`
                  ${tamanhoClasses} rounded-lg font-medium transition-all border
                  flex items-center gap-1.5
                  ${listaSelecionada === lista.id
                    ? 'bg-[#D2B68A] text-[#222D52] border-[#D2B68A]'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border-transparent hover:border-[var(--border-color)]'
                  }
                `}
              >
                <Folder size={tamanho === 'sm' ? 12 : 14} />
                <span>{lista.nome}</span>
                {lista.total_contatos > 0 && (
                  <span className={`opacity-70 ${tamanho === 'sm' ? 'text-[8px]' : 'text-[10px]'}`}>
                    ({lista.total_contatos})
                  </span>
                )}
              </button>
            )}

            {isAdmin && editandoId !== lista.id && (
              <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => iniciarEdicao(lista, e)}
                  className="p-0.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-full hover:bg-[var(--bg-tertiary)] transition-colors"
                  title="Renomear lista"
                >
                  <Pencil size={10} className="text-[var(--text-secondary)]" />
                </button>
                {listaSelecionada === lista.id && (
                  <button
                    onClick={(e) => handleExcluirLista(lista.id, e)}
                    className="p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    title="Excluir lista"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {listasArray.length === 0 && !showCriar && (
          <p className="text-xs text-[var(--text-secondary)] py-1">
            Nenhuma lista criada. Clique em "Nova Lista" para começar.
          </p>
        )}
      </div>
    </div>
  )
}