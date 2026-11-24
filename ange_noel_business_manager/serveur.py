"""
Serveur Local Haute Performance & PWA pour « Les Gourmandises de Ange Noël »
Permet d'utiliser l'application sur le PC de caisse et sur tous les smartphones/tablettes connectés au même réseau Wi-Fi.
"""
import http.server
import socket
import socketserver
import webbrowser
import os
import sys

PORT = 8080

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        # Ne transmet rien, permet de déterminer l'interface locale active
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

class PWAHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # En-têtes pour supporter le Service Worker et le mode PWA
        if self.path.endswith('.webmanifest') or self.path.endswith('.manifest'):
            self.send_header('Content-Type', 'application/manifest+json; charset=utf-8')
        elif self.path.endswith('sw.js'):
            self.send_header('Content-Type', 'application/javascript; charset=utf-8')
            self.send_header('Service-Worker-Allowed', '/')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        elif self.path.endswith('.svg'):
            self.send_header('Content-Type', 'image/svg+xml')
        super().end_headers()

def run():
    # Se positionner dans le dossier du script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    local_ip = get_local_ip()
    url_local = f"http://localhost:{PORT}"
    url_lan = f"http://{local_ip}:{PORT}"

    print("=" * 66)
    print(" 🍨 LES GOURMANDISES DE ANGE NOËL — BUSINESS MANAGER (POS) 🍨")
    print("=" * 66)
    print(f" ▶ Sur cet ordinateur : {url_local}")
    print(f" ▶ Sur téléphones / tablettes (même Wi-Fi) : {url_lan}")
    print("=" * 66)
    print(" Conseil mobile : Ouvrez l'adresse dans Chrome ou Safari, puis")
    print(" cliquez sur 'Ajouter à l'écran d'accueil' pour installer l'app.")
    print(" Appuyez sur Ctrl + C dans cette fenêtre pour arrêter le serveur.")
    print("=" * 66)

    # Ouvrir automatiquement le navigateur sur le PC
    try:
        webbrowser.open(url_local)
    except Exception:
        pass

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), PWAHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nArrêt du serveur.")
            sys.exit(0)

if __name__ == "__main__":
    run()
