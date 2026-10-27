import { useEffect, useState } from 'react'
import { ConfirmacaoSituacao } from '../components/usuarios/ConfirmacaoSituacao.tsx'
import { Paginacao } from '../components/usuarios/Paginacao.tsx'
import { UsuarioFormulario } from '../components/usuarios/UsuarioFormulario.tsx'
import { UsuariosFiltros } from '../components/usuarios/UsuariosFiltros.tsx'
import { UsuariosTabela } from '../components/usuarios/UsuariosTabela.tsx'
import { listarAreas } from '../services/areaService.ts'
import {
  atualizarSituacaoUsuario,
  atualizarUsuario,
  criarUsuario,
  listarUsuarios,
  UsuarioServiceError,
} from '../services/usuarioService.ts'
import type { ApiFieldError } from '../types/api.ts'
import type {
  AtualizarUsuarioRequest,
  CriarUsuarioRequest,
  Pagina,
  RecursoResumo,
  Usuario,
  UsuarioFiltro,
} from '../types/usuario.ts'
import styles from './UsuariosPage.module.css'

const FILTRO_VAZIO: UsuarioFiltro = {
  nome: '',
  email: '',
  departamento: '',
  perfil: '',
  situacao: '',
}

const TAMANHO_PAGINA = 10

/** Áreas ativas listadas no formulário; o catálogo de uma empresa cabe nisso. */
const TAMANHO_OPCOES_AREA = 100

/**
 * Área administrativa de gestão de usuários: listagem com filtros e paginação,
 * cadastro e edição no mesmo painel, e mudança de situação com confirmação.
 *
 * A página é a única dona da comunicação com a API — filtros, tabela e
 * formulário só apresentam e avisam a intenção. Todo acesso passa pelo
 * `usuarioService`; nenhum componente chama o Axios.
 */
interface ResultadoBusca {
  /** Identifica a busca que produziu este resultado (filtros + página + recarga). */
  chave: string
  dados: Pagina<Usuario> | null
  erro: string | null
}

function mensagemDe(causa: unknown, padrao: string): string {
  return causa instanceof UsuarioServiceError ? causa.message : padrao
}

export function UsuariosPage() {
  // `filtros` é o que está digitado; `filtrosAplicados` é o que foi buscado.
  // Separar os dois evita uma requisição por tecla digitada.
  const [filtros, setFiltros] = useState<UsuarioFiltro>(FILTRO_VAZIO)
  const [filtrosAplicados, setFiltrosAplicados] =
    useState<UsuarioFiltro>(FILTRO_VAZIO)
  const [pagina, setPagina] = useState(0)
  // Contador de recarga: é o que "Tentar novamente" e as operações de escrita
  // incrementam para refazer a busca sem mexer nos filtros.
  const [recarga, setRecarga] = useState(0)

  const [resultado, setResultado] = useState<ResultadoBusca | null>(null)

  const [formularioAberto, setFormularioAberto] = useState(false)
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState<Usuario | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<ApiFieldError[]>([])

  const [confirmacao, setConfirmacao] = useState<Usuario | null>(null)
  const [situacaoEmAndamento, setSituacaoEmAndamento] = useState<string | null>(
    null,
  )
  const [aviso, setAviso] = useState<string | null>(null)
  const [erroOperacao, setErroOperacao] = useState<string | null>(null)

  // Opções do campo "Área" do formulário. Sem elas o campo segue funcionando,
  // só que vazio — por isso a falha não vira erro na tela.
  const [opcoesAreas, setOpcoesAreas] = useState<RecursoResumo[]>([])

  useEffect(() => {
    const controlador = new AbortController()
    listarAreas(
      {},
      { page: 0, size: TAMANHO_OPCOES_AREA },
      { signal: controlador.signal },
    )
      .then((busca) => {
        if (!controlador.signal.aborted) {
          setOpcoesAreas(busca.content.map(({ id, nome }) => ({ id, nome })))
        }
      })
      .catch(() => undefined)
    return () => controlador.abort()
  }, [])

  const chaveBusca = JSON.stringify([filtrosAplicados, pagina, recarga])

  // `carregando` é derivado: o resultado em mãos é de outra busca, então a que
  // vale ainda está em voo. Derivar evita acender o indicador por setState
  // dentro do efeito, que dispararia um render em cascata a cada busca.
  const carregando = resultado?.chave !== chaveBusca
  const erroBusca = resultado?.chave === chaveBusca ? resultado.erro : null
  const dados = resultado?.chave === chaveBusca ? resultado.dados : null

  useEffect(() => {
    const controlador = new AbortController()

    listarUsuarios(
      filtrosAplicados,
      { page: pagina, size: TAMANHO_PAGINA },
      { signal: controlador.signal },
    )
      .then((busca) => {
        if (!controlador.signal.aborted) {
          setResultado({ chave: chaveBusca, dados: busca, erro: null })
        }
      })
      .catch((causa: unknown) => {
        // Busca cancelada (filtro trocado no meio) não é erro para o usuário.
        if (!controlador.signal.aborted) {
          setResultado({
            chave: chaveBusca,
            dados: null,
            erro: mensagemDe(causa, 'Não foi possível carregar os usuários.'),
          })
        }
      })

    return () => controlador.abort()
  }, [chaveBusca, filtrosAplicados, pagina])

  function recarregar() {
    setRecarga((atual) => atual + 1)
  }

  function aplicarFiltros() {
    setPagina(0)
    setFiltrosAplicados(filtros)
  }

  function limparFiltros() {
    setFiltros(FILTRO_VAZIO)
    setPagina(0)
    setFiltrosAplicados(FILTRO_VAZIO)
  }

  function abrirFormulario(usuario: Usuario | null) {
    setUsuarioEmEdicao(usuario)
    setErroFormulario(null)
    setFieldErrors([])
    setAviso(null)
    setErroOperacao(null)
    setFormularioAberto(true)
  }

  function fecharFormulario() {
    setFormularioAberto(false)
    setUsuarioEmEdicao(null)
    setErroFormulario(null)
    setFieldErrors([])
  }

  function registrarErroDoFormulario(causa: unknown, padrao: string) {
    if (causa instanceof UsuarioServiceError) {
      setErroFormulario(causa.message)
      setFieldErrors(causa.fieldErrors)
      return
    }
    setErroFormulario(padrao)
    setFieldErrors([])
  }

  async function cadastrar(request: CriarUsuarioRequest) {
    setSalvando(true)
    setErroFormulario(null)
    setFieldErrors([])
    try {
      await criarUsuario(request)
      // Fechar o painel descarta o estado do formulário, então o próximo
      // cadastro começa em branco sem precisar limpar campo por campo.
      fecharFormulario()
      setAviso('Usuário cadastrado.')
      setPagina(0)
      recarregar()
    } catch (causa) {
      registrarErroDoFormulario(causa, 'Não foi possível cadastrar o usuário.')
    } finally {
      setSalvando(false)
    }
  }

  async function salvarEdicao(id: string, request: AtualizarUsuarioRequest) {
    setSalvando(true)
    setErroFormulario(null)
    setFieldErrors([])
    try {
      await atualizarUsuario(id, request)
      fecharFormulario()
      setAviso('Usuário atualizado.')
      recarregar()
    } catch (causa) {
      registrarErroDoFormulario(causa, 'Não foi possível salvar as alterações.')
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarSituacao() {
    if (!confirmacao) {
      return
    }

    const alvo = confirmacao
    const novaSituacao = alvo.situacao === 'ATIVO' ? 'INATIVO' : 'ATIVO'
    setSituacaoEmAndamento(alvo.id)
    setErroOperacao(null)
    try {
      await atualizarSituacaoUsuario(alvo.id, novaSituacao)
      setConfirmacao(null)
      setAviso(
        novaSituacao === 'INATIVO'
          ? 'Usuário desativado.'
          : 'Usuário reativado.',
      )
      recarregar()
    } catch (causa) {
      setConfirmacao(null)
      setErroOperacao(
        mensagemDe(causa, 'Não foi possível alterar a situação do usuário.'),
      )
    } finally {
      setSituacaoEmAndamento(null)
    }
  }

  const usuarios = dados?.content ?? []
  const listaVazia = !carregando && erroBusca === null && usuarios.length === 0

  return (
    <div className={styles.page}>
      <header className={styles.cabecalho}>
        <div>
          <h1>Usuários</h1>
          <p className={styles.hint}>
            Consulte, cadastre e administre os usuários do tenant.
          </p>
        </div>
        <button
          type="button"
          className={styles.novo}
          onClick={() => abrirFormulario(null)}
        >
          Novo usuário
        </button>
      </header>

      {/* Uma live region só para a página: avisos de sucesso e erro de
          operação chegam a quem usa leitor de tela sem mover o foco. */}
      <div role="status" aria-live="polite" className={styles.avisoRegiao}>
        {aviso && <p className={styles.aviso}>{aviso}</p>}
      </div>

      {erroOperacao && (
        <p className={styles.erro} role="alert">
          {erroOperacao}
        </p>
      )}

      <UsuariosFiltros
        valores={filtros}
        onChange={setFiltros}
        onAplicar={aplicarFiltros}
        onLimpar={limparFiltros}
        carregando={carregando}
      />

      {formularioAberto && (
        <UsuarioFormulario
          // `key` reinicia o formulário ao trocar de usuário (ou ao voltar ao
          // cadastro): é o reset de estado idiomático do React, sem efeito.
          key={usuarioEmEdicao?.id ?? 'novo'}
          usuario={usuarioEmEdicao}
          areas={opcoesAreas}
          salvando={salvando}
          erro={erroFormulario}
          fieldErrors={fieldErrors}
          onCriar={(request) => void cadastrar(request)}
          onAtualizar={(id, request) => void salvarEdicao(id, request)}
          onFechar={fecharFormulario}
        />
      )}

      {carregando && (
        <p role="status" className={styles.estado}>
          Carregando usuários…
        </p>
      )}

      {erroBusca && (
        <div className={styles.erro} role="alert">
          <p>{erroBusca}</p>
          <button type="button" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      )}

      {listaVazia && (
        <p className={styles.estado}>
          Nenhum usuário encontrado com os filtros atuais.
        </p>
      )}

      {!carregando && erroBusca === null && usuarios.length > 0 && (
        <>
          <UsuariosTabela
            usuarios={usuarios}
            situacaoEmAndamento={situacaoEmAndamento}
            onEditar={abrirFormulario}
            onAlterarSituacao={setConfirmacao}
          />
          <Paginacao
            pagina={dados?.page.number ?? 0}
            totalPaginas={dados?.page.totalPages ?? 1}
            totalElementos={dados?.page.totalElements ?? 0}
            onIrPara={setPagina}
            desabilitado={carregando}
          />
        </>
      )}

      {confirmacao && (
        <ConfirmacaoSituacao
          usuario={confirmacao}
          processando={situacaoEmAndamento === confirmacao.id}
          onConfirmar={() => void confirmarSituacao()}
          onCancelar={() => setConfirmacao(null)}
        />
      )}
    </div>
  )
}
