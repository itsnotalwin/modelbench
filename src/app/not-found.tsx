import Link from "next/link";
import { Icon } from "@/components/icons";
export default function NotFound() { return <main id="main-content" className="page-container interior-page"><div className="empty-state"><div className="eyebrow">ERROR / 404</div><h1>Outside the lab</h1><p>This page does not exist. Return to the explorer to find a model build.</p><Link href="/" className="button primary">Back to the explorer<Icon name="arrow" size={15}/></Link></div></main>; }
