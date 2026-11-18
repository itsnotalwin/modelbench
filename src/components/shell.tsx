"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { REPO_URL } from "@/lib/bench";
import { BrandMark, Icon } from "./icons";
import { useLab } from "./lab-provider";

const links = [{ href: "/", name: "Explore", icon: "grid" }, { href: "/challenges", name: "Challenges", icon: "layers" }, { href: "/compare", name: "Compare", icon: "compare" }, { href: "/leaderboard", name: "Leaderboard", icon: "trophy" }];
export function Header() {
  const path = usePathname(); const { selected, openGuide } = useLab();
  return <header className="site-header"><div className="header-inner">
    <Link href="/" className="brand" aria-label="ModelBench home"><BrandMark/><span>ModelBench</span></Link>
    <span className="header-divider"/>
    <nav className="main-nav" aria-label="Main navigation">{links.map((link) => <Link key={link.href} className={`nav-link ${path === link.href ? "active" : ""}`} href={link.href} aria-current={path === link.href ? "page" : undefined}><Icon name={link.icon} size={16}/>{link.name}{link.href === "/compare" && selected.length > 0 && <span className="nav-count">{selected.length}</span>}</Link>)}</nav>
    <div className="header-tools"><button className="guide-link" onClick={openGuide}><Icon name="book" size={16}/><span>Lab guide</span></button><a className="github-link" href={REPO_URL} target="_blank" rel="noreferrer"><Icon name="github" size={16}/><span>GitHub</span><Icon name="upRight" size={13}/></a></div>
  </div></header>;
}
export function Footer() {
  const { openGuide } = useLab();
  return <footer className="site-footer"><div className="footer-inner"><div className="footer-brand"><BrandMark size={23}/><strong>ModelBench</strong><span>An open benchmark lab.</span></div><div className="footer-links"><button onClick={openGuide}>Lab guide</button><a href={REPO_URL} target="_blank" rel="noreferrer">Source repository <Icon name="upRight" size={12}/></a></div></div></footer>;
}
