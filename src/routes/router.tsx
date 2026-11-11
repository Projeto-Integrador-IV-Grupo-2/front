import {
  createBrowserRouter,
  Navigate,
  type RouteObject,
} from 'react-router-dom'
import { ProtectedRoute } from '../components/auth/ProtectedRoute.tsx'
import { RotaPublica } from '../components/auth/RotaPublica.tsx'
import { AppLayout } from '../components/layout/AppLayout.tsx'
import { AcompanhamentoPage } from '../pages/AcompanhamentoPage.tsx'
import { AssistentePage } from '../pages/AssistentePage.tsx'
import { AreasPage } from '../pages/AreasPage.tsx'
import { CategoriasPage } from '../pages/CategoriasPage.tsx'
import { ConhecimentoPage } from '../pages/ConhecimentoPage.tsx'
import { DocumentoDetalhePage } from '../pages/DocumentoDetalhePage.tsx'
import { ConteudosPage } from '../pages/ConteudosPage.tsx'
import { DashboardPage } from '../pages/DashboardPage.tsx'
import { HistoricoPage } from '../pages/HistoricoPage.tsx'
import { EsqueciSenhaPage } from '../pages/EsqueciSenhaPage.tsx'
import { LoginPage } from '../pages/LoginPage.tsx'
import { RedefinirSenhaPage } from '../pages/RedefinirSenhaPage.tsx'
import { NotFoundPage } from '../pages/NotFoundPage.tsx'
import { PdiEditorPage } from '../pages/PdiEditorPage.tsx'
import { PdiPage } from '../pages/PdiPage.tsx'
import { PerfilPage } from '../pages/PerfilPage.tsx'
import { TrilhaDetalhePage } from '../pages/TrilhaDetalhePage.tsx'
import { TrilhaEstudoPage } from '../pages/TrilhaEstudoPage.tsx'
import { TrilhasPage } from '../pages/TrilhasPage.tsx'
import { UsuariosPage } from '../pages/UsuariosPage.tsx'
import { ROTAS } from './paths.ts'
import {
  PERFIS_ACOMPANHAMENTO,
  PERFIS_ESTUDO,
  PERFIS_GESTAO_AREA,
  PERFIS_GESTAO_CONTEUDO,
  PERFIS_GESTAO_PDI,
} from './permissions.ts'

// Exportada à parte do router para poder ser reutilizada em testes com
// createMemoryRouter (ver router.test.tsx), sem depender do histórico real
// do navegador.
export const routes: RouteObject[] = [
  {
    // Guarda toda a área autenticada: quem não tem sessão nem chega ao layout.
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: ROTAS.dashboard, element: <DashboardPage /> },
          { path: ROTAS.trilhas, element: <TrilhasPage /> },
          { path: ROTAS.trilhaDetalhe, element: <TrilhaDetalhePage /> },
          // Rota estática: o router a prefere a /trilhas/:id.
          { path: ROTAS.pdi, element: <PdiPage /> },
          {
            // O editor é de quem monta PDIs; o colaborador fica em "Meu PDI".
            element: <ProtectedRoute perfis={PERFIS_GESTAO_PDI} />,
            children: [{ path: ROTAS.pdiDetalhe, element: <PdiEditorPage /> }],
          },
          { path: ROTAS.conhecimento, element: <ConhecimentoPage /> },
          { path: ROTAS.assistente, element: <AssistentePage /> },
          { path: ROTAS.documentoDetalhe, element: <DocumentoDetalhePage /> },
          { path: ROTAS.historico, element: <HistoricoPage /> },
          // Todo perfil edita os próprios dados.
          { path: ROTAS.perfil, element: <PerfilPage /> },
          {
            // Área administrativa: o perfil exigido fica na rota, não na página.
            element: <ProtectedRoute perfis={['ADMIN']} />,
            children: [{ path: ROTAS.usuarios, element: <UsuariosPage /> }],
          },
          {
            // Estudar é de quem cursa a trilha; a gestão monta e acompanha.
            element: <ProtectedRoute perfis={PERFIS_ESTUDO} />,
            children: [
              { path: ROTAS.trilhaEstudo, element: <TrilhaEstudoPage /> },
            ],
          },
          {
            element: <ProtectedRoute perfis={PERFIS_GESTAO_AREA} />,
            children: [{ path: ROTAS.areas, element: <AreasPage /> }],
          },
          {
            element: <ProtectedRoute perfis={PERFIS_GESTAO_CONTEUDO} />,
            children: [
              { path: ROTAS.conteudos, element: <ConteudosPage /> },
              { path: ROTAS.categorias, element: <CategoriasPage /> },
            ],
          },
          {
            element: <ProtectedRoute perfis={PERFIS_ACOMPANHAMENTO} />,
            children: [
              { path: ROTAS.acompanhamento, element: <AcompanhamentoPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: ROTAS.login, element: <LoginPage /> },
  {
    // Recuperação de senha: só para quem não está logado.
    element: <RotaPublica />,
    children: [
      { path: ROTAS.esqueciSenha, element: <EsqueciSenhaPage /> },
      { path: ROTAS.redefinirSenha, element: <RedefinirSenhaPage /> },
    ],
  },
  { path: '/', element: <Navigate to={ROTAS.dashboard} replace /> },
  { path: '*', element: <NotFoundPage /> },
]

export const router = createBrowserRouter(routes)
