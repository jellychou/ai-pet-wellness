import logo from "../assets/images/logo.png";
import headerLogo from "../assets/images/header-logo.png";

export function Logo({ compact = false }: { compact?: boolean }) {
  return <img src={logo} alt="logo" width={100} />;
}

export function HeaderLogo() {
  return <img src={headerLogo} alt="logo" width={46} />;
}
