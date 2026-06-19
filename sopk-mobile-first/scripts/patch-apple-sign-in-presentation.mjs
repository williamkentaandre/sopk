/**
 * Corrige presentationAnchor du plugin Apple Sign In (fenêtre WKWebView parfois absente sur Capacitor 8).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginSwift = path.resolve(
  __dirname,
  "../node_modules/@capawesome/capacitor-apple-sign-in/ios/Plugin/AppleSignInPlugin.swift",
);

const PATCH_MARKER = "bridge?.viewController?.view.window";

if (!fs.existsSync(pluginSwift)) {
  console.warn("patch-apple-sign-in-presentation: plugin absent, npm install puis relance.");
  process.exit(0);
}

const source = fs.readFileSync(pluginSwift, "utf8");
if (source.includes(PATCH_MARKER)) {
  console.log("patch-apple-sign-in-presentation: déjà appliqué.");
  process.exit(0);
}

const oldBlock = `extension AppleSignInPlugin: ASAuthorizationControllerPresentationContextProviding {
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return self.bridge?.webView?.window ?? ASPresentationAnchor()
    }
}`;

const newBlock = `extension AppleSignInPlugin: ASAuthorizationControllerPresentationContextProviding {
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        if let window = self.bridge?.viewController?.view.window {
            return window
        }
        if let window = self.bridge?.webView?.window {
            return window
        }
        for scene in UIApplication.shared.connectedScenes {
            guard let windowScene = scene as? UIWindowScene else { continue }
            if let window = windowScene.windows.first(where: { $0.isKeyWindow }) {
                return window
            }
        }
        return ASPresentationAnchor()
    }
}`;

if (!source.includes(oldBlock)) {
  console.warn("patch-apple-sign-in-presentation: bloc Swift inattendu, patch ignoré.");
  process.exit(0);
}

let next = source.replace(oldBlock, newBlock);
if (!next.includes("import UIKit")) {
  next = next.replace("import Foundation", "import Foundation\nimport UIKit");
}

fs.writeFileSync(pluginSwift, next);
console.log("patch-apple-sign-in-presentation: fenêtre de présentation Apple Sign In corrigée.");
