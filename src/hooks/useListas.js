import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export function useListas() {
  const { user } = useAuth()
  const [listas, setListas] = useState([])
  const [loading, setLoading] = useState(false)

  const isAdmin = user?.email === 'closermatheus@gmail.com'

  // ===== CARREGAR LISTAS =====
  const carregarListas = useCallback(async () => {
    if (!user?.equipeId) {
      setListas([])
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      // Primeiro, buscar todas as listas
      const { data: listasData, error: listasError } = await supabase
        .from('listas')
        .select('*')
        .eq('equipe_id', user.equipeId)
        .order('criado_em', { ascending: false })

      if (listasError) throw listasError

      // Buscar contagem de contatos por lista
      const { data: contatosData, error: contatosError } = await supabase
        .from('contatos')
        .select('lista_id')
        .eq('equipe_id', user.equipeId)
        .is('deletado_em', null)

      if (contatosError) throw contatosError

      // Calcular contagem por lista
      const contagemPorLista = {}
      contatosData?.forEach(c => {
        if (c.lista_id) {
          contagemPorLista[c.lista_id] = (contagemPorLista[c.lista_id] || 0) + 1
        }
      })

      // Combinar dados
      const listasComContagem = (listasData || []).map(lista => ({
        ...lista,
        total_contatos: contagemPorLista[lista.id] || 0
      }))

      setListas(listasComContagem)
      return listasComContagem
    } catch (error) {
      console.error('Erro ao carregar listas:', error)
      toast.error('Erro ao carregar listas')
      setListas([])
      return []
    } finally {
      setLoading(false)
    }
  }, [user])

  // ===== CRIAR LISTA =====
  const criarLista = async (nome, descricao = '') => {
    if (!user?.equipeId) {
      toast.error('Equipe não encontrada')
      return null
    }

    if (!nome.trim()) {
      toast.error('Digite um nome para a lista')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('listas')
        .insert({
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          equipe_id: user.equipeId,
          criado_por: user.id,
          criado_em: new Date().toISOString(),
          total_contatos: 0
        })
        .select()
        .single()

      if (error) throw error

      setListas(prev => [data, ...(prev || [])])
      toast.success(`Lista "${nome}" criada!`)
      return data
    } catch (error) {
      console.error('Erro ao criar lista:', error)
      toast.error('Erro ao criar lista')
      return null
    }
  }

  // ===== RENOMEAR LISTA =====
  const renomearLista = async (listaId, novoNome) => {
    if (!novoNome.trim()) {
      toast.error('Digite um nome válido')
      return false
    }

    if (!isAdmin) {
      toast.error('Apenas administradores podem renomear listas')
      return false
    }

    try {
      const { error } = await supabase
        .from('listas')
        .update({ 
          nome: novoNome.trim(),
          atualizado_em: new Date().toISOString()
        })
        .eq('id', listaId)

      if (error) throw error

      setListas(prev => (prev || []).map(lista => 
        lista.id === listaId ? { ...lista, nome: novoNome.trim() } : lista
      ))
      
      toast.success('Lista renomeada!')
      return true
    } catch (error) {
      console.error('Erro ao renomear lista:', error)
      toast.error('Erro ao renomear lista')
      return false
    }
  }

  // ===== EXCLUIR LISTA =====
  const excluirLista = async (listaId) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem excluir listas')
      return false
    }

    try {
      // Remover referência da lista nos contatos
      await supabase
        .from('contatos')
        .update({ lista_id: null })
        .eq('lista_id', listaId)

      // Excluir a lista
      const { error } = await supabase
        .from('listas')
        .delete()
        .eq('id', listaId)

      if (error) throw error

      setListas(prev => (prev || []).filter(l => l.id !== listaId))
      toast.success('Lista excluída!')
      return true
    } catch (error) {
      console.error('Erro ao excluir lista:', error)
      toast.error('Erro ao excluir lista')
      return false
    }
  }

  // ===== ATUALIZAR TOTAL DE CONTATOS =====
  const atualizarTotalContatos = async (listaId) => {
    try {
      const { count, error } = await supabase
        .from('contatos')
        .select('*', { count: 'exact', head: true })
        .eq('lista_id', listaId)
        .is('deletado_em', null)

      if (error) throw error

      await supabase
        .from('listas')
        .update({ total_contatos: count })
        .eq('id', listaId)

      setListas(prev => (prev || []).map(l => 
        l.id === listaId ? { ...l, total_contatos: count } : l
      ))
      
      return count
    } catch (error) {
      console.error('Erro ao atualizar total:', error)
      return 0
    }
  }

  // ===== BUSCAR LISTA POR ID =====
  const buscarLista = useCallback(async (listaId) => {
    if (!listaId) return null

    try {
      const { data, error } = await supabase
        .from('listas')
        .select('*')
        .eq('id', listaId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Erro ao buscar lista:', error)
      return null
    }
  }, [])

  // ===== CARREGAR INICIALMENTE =====
  useEffect(() => {
    if (user?.equipeId) {
      carregarListas()
    }
  }, [user?.equipeId])

  return {
    listas,
    loading,
    carregarListas,
    criarLista,
    renomearLista,
    excluirLista,
    atualizarTotalContatos,
    buscarLista
  }
}