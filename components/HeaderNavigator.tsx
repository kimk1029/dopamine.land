/**
 * Navigation now lives in the arcade shell sidebar (`components/layout/ArcadeShell`),
 * which wraps every page from the root layout. This shim keeps the existing
 * `<HeaderNavigator />` call sites and `refreshUserPoints` imports compiling
 * while pages are migrated off it.
 */
export { refreshUserPoints } from '@/lib/user-session'

const HeaderNavigator = () => null

export default HeaderNavigator
