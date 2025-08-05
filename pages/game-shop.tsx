import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import useAuth from "../hooks/useAuth";
import useUserCache from "../hooks/useUserCache";
import router, { useRouter } from "next/router";
import CachedImage from "../components/utils/CachedImage";
import useIsMobile from "../hooks/useIsMobile";
import Certification from "../components/common/Certification";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Alert } from "@mui/material";

const ENDPOINT = "/api";

interface Game {
  gameId: string;
  name: string;
  price: number;
  rating?: number;
  genre?: string;
  description?: string;
  bannerHash?: string;
  iconHash?: string;
  owner_id?: string;
}

interface PromptState {
  message: string;
  resolve: (value: { confirmed: boolean }) => void;
  item?: Game;
}

interface AlertState {
  message: string;
}

function useShopLogic() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [alert, setAlert] = useState<AlertState | null>(null);

  const { token } = useAuth();
  const { getUser: getUserFromCache } = useUserCache();
  const router = useRouter();

  // Constantes réutilisées
  const AUTH_HEADER = useMemo(
    () => ({
      "Content-Type": "application/json"
    }),
    [token]
  );

  // Récupération des jeux
  const fetchGames = useCallback(() => {
    setLoading(true);
    fetch(`${ENDPOINT}/games`, {
      method: "GET",
      headers: AUTH_HEADER,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch games");
        return res.json();
      })
      .then((data) => {
        setGames(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [AUTH_HEADER]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  // Prompt personnalisé
  const customPrompt = useCallback((message: string, item?: Game) => {
    return new Promise<{ confirmed: boolean }>((resolve) => {
      setPrompt({ message, resolve, item });
    });
  }, []);

  // Résultat du prompt
  const handlePromptResult = useCallback(
    (confirmed: boolean) => {
      if (prompt) {
        prompt.resolve({ confirmed });
        setPrompt(null);
      }
    },
    [prompt]
  );

  // Achat d'un jeu
  const handleBuyGame = useCallback(
    async (game: Game) => {
      const result = await customPrompt(
        `Buy "${game.name}"?\nPrice: ${game.price}`,
        game
      );
      if (result.confirmed) {
        fetch(`${ENDPOINT}/games/${game.gameId}/buy`, {
          method: "POST",
          headers: AUTH_HEADER,
        })
          .then(async (res) => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to buy game");
            return data;
          })
          .then(() => {
            fetchGames();
          })
          .catch((err) => {
            setAlert({ message: err.message });
          });
      }
    },
    [AUTH_HEADER, customPrompt, fetchGames]
  );

  // Shop skeleton cards for loading
  const skeletons = useMemo(
    () =>
      Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="shop-game-modern-card shop-blur"
          style={{
            width: 420,
            background: "var(--background-medium)",
            borderRadius: 16,
            boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
            overflow: "hidden",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            marginBottom: 24,
            border: "2px solid var(--border-color)",
            filter: "blur(0.5px) grayscale(0.2) brightness(0.8)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 160,
              background: "#18181c",
            }}
          >
            <div className="skeleton-banner" />
            <div
              className="skeleton-icon"
              style={{ left: 32, bottom: -48, position: "absolute" }}
            />
          </div>
          <div
            style={{
              padding: "56px 32px 24px 32px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              position: "relative",
              minHeight: 160,
            }}
          >
            <div className="skeleton-title" style={{ width: "60%" }} />
            <div className="skeleton-desc" style={{ width: "90%" }} />
            <div
              className="skeleton-properties"
              style={{ width: "40%", height: 32 }}
            />
          </div>
        </div>
      )),
    []
  );

  // Map pour stocker les infos propriétaires par id
  const [ownerInfoMap, setOwnerInfoMap] = useState<Record<string, any>>({});

  // Charger les infos propriétaires pour chaque jeu
  useEffect(() => {
    const fetchOwners = async () => {
      const ownersToFetch = games
        .map((g) => g.owner_id)
        .filter(Boolean)
        .filter((id, i, arr) => arr.indexOf(id) === i && !ownerInfoMap[id]);
      if (ownersToFetch.length === 0) return;
      const newMap: Record<string, any> = {};
      await Promise.all(
        ownersToFetch.map(async (id) => {
          try {
            const info = await getUserFromCache(id);
            newMap[id] = info;
          } catch {
            // ignore
          }
        })
      );
      if (Object.keys(newMap).length > 0) {
        setOwnerInfoMap((prev) => ({ ...prev, ...newMap }));
      }
    };
    if (games.length > 0) fetchOwners();
    // eslint-disable-next-line
  }, [games, getUserFromCache]);

  // Vérifier si on est dans le launcher
  const isLauncher = router.query.from === "launcher";

  return {
    games,
    loading,
    error,
    prompt,
    alert,
    handleBuyGame,
    setAlert,
    setPrompt,
    isLauncher,
    ownerInfoMap,
    skeletons,
    handlePromptResult,
  };
}

// Version Desktop
function ShopDesktop(props: any) {
  const {
    games,
    loading,
    error,
    prompt,
    alert,
    handleBuyGame,
    setAlert,
    setPrompt,
    isLauncher,
    ownerInfoMap,
  } = props;

  // Shop skeleton cards for loading
  const skeletons = useMemo(
    () =>
      Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="shop-game-modern-card shop-blur"
          style={{
            width: 420,
            background: "var(--background-medium)",
            borderRadius: 16,
            boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
            overflow: "hidden",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            marginBottom: 24,
            border: "2px solid var(--border-color)",
            filter: "blur(0.5px) grayscale(0.2) brightness(0.8)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 160,
              background: "#18181c",
            }}
          >
            <div className="skeleton-banner" />
            <div
              className="skeleton-icon"
              style={{ left: 32, bottom: -48, position: "absolute" }}
            />
          </div>
          <div
            style={{
              padding: "56px 32px 24px 32px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              position: "relative",
              minHeight: 160,
            }}
          >
            <div className="skeleton-title" style={{ width: "60%" }} />
            <div className="skeleton-desc" style={{ width: "90%" }} />
            <div
              className="skeleton-properties"
              style={{ width: "40%", height: 32 }}
            />
          </div>
        </div>
      )),
    []
  );

  const { handlePromptResult } = props;

  return (
    <div className="shop-root">
      <div
        className="shop-games-section"
        style={{
          padding: 0,
          background: "none",
          border: "none",
          boxShadow: "none",
          overflowY: "auto",
          maxHeight: "calc(100vh - 120px)",
        }}
      >
        {loading && (
          <div style={{ position: "relative" }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "32px",
                justifyContent: "center",
                marginTop: 24,
                filter: "blur(0.5px) grayscale(0.2) brightness(0.8)",
                pointerEvents: "none",
                width: "95vw",
              }}
            >
              {skeletons}
            </div>
            <div className="gamepage-loading-overlay">
              <div className="inventory-loading-spinner" />
            </div>
          </div>
        )}
        {error && <div className="shop-error">{error}</div>}
        {games.length === 0 && !loading && !error && (
          <div className="shop-games-empty">No games available.</div>
        )}
        {!loading && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "32px",
              justifyContent: "center",
              marginTop: 24,
            }}
          >
            {games
              .slice()
              .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
              .map((game) => {
                const ownerId = game.owner_id;
                const ownerInfo = ownerId ? ownerInfoMap[ownerId] : null;
                return (
                  <div
                    key={game.gameId}
                    className="shop-game-modern-card"
                    style={{
                      width: 420,
                      background: "var(--background-medium)",
                      borderRadius: 16,
                      boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
                      overflow: "hidden",
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      marginBottom: 24,
                      border: "2px solid var(--border-color)",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: 160,
                        background: "#18181c",
                      }}
                    >
                      {
                        <img
                          src={"/banners-icons/" + game?.bannerHash}
                          alt="banner"
                          style={{
                            width: "100%",
                            height: "100%",
                            maxWidth: "100%",
                            objectFit: "cover",
                            opacity: 0.52,
                            position: "absolute",
                            left: 0,
                            top: 0,
                            zIndex: 0,
                          }}
                        />
                      }
                      <img
                        src={"/games-icons/" + game.iconHash}
                        alt={game.name}
                        style={{
                          width: 96,
                          height: 96,
                          objectFit: "contain",
                          borderRadius: 16,
                          background: "#23232a",
                          border: "2px solid #888",
                          position: "absolute",
                          left: 32,
                          bottom: -48,
                          zIndex: 2,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        padding: "56px 32px 24px 32px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        position: "relative",
                        minHeight: 160,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          marginBottom: 4,
                          color: "var(--text-color-primary)",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Link
                          href={`/game?gameId=${game.gameId}${isLauncher ? "&from=launcher" : ""}`}
                          className="shop-game-link"
                          style={{ color: "white", textDecoration: "none" }}
                        >
                          {game.name}
                        </Link>
                        <span
                          style={{
                            fontSize: 15,
                            color: "var(--text-color-secondary)",
                            fontWeight: 400,
                            marginLeft: 8,
                          }}
                        >
                          {game.genre}
                        </span>
                      </div>
                      {/* --- Affichage propriétaire --- */}
                      {ownerInfo ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, justifyContent: "space-between" }}>
                          <a
                            href={`/profile?user=${ownerInfo.id}`}
                            style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "#fff" }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <CachedImage
                                src={`/avatar/${ownerInfo.id}`}
                                alt={ownerInfo.username}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  marginRight: 8,
                                  objectFit: "cover",
                                  border: "2px solid #444"
                                }}
                              />
                              <span style={{ fontWeight: 500 }}>
                                {ownerInfo.username}
                                <Certification
                                  user={ownerInfo}
                                  style={{
                                    marginLeft: 4,
                                    width: 16,
                                    height: 16,
                                    position: "relative",
                                    top: -2,
                                    verticalAlign: "middle",
                                  }}
                                />
                              </span>
                            </div>
                          </a>
                          <div
                            style={{
                              color: "var(--gold-color)",
                              fontWeight: 700,
                              fontSize: 18,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              marginLeft: 12,
                            }}
                          >
                            {game.price}
                            <CachedImage
                              src="/assets/credit.png"
                              className="shop-credit-icon"
                              alt="credits"
                            />
                          </div>
                        </div>
                      ) : null}
                      {/* --- Fin propriétaire --- */}
                      <div
                        style={{
                          color: "var(--text-color-secondary)",
                          fontSize: 15,
                          marginBottom: 6,
                          minHeight: 38,
                          maxHeight: 38,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {game.description}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
      {/* Prompt overlay for games */}
      {prompt && (
        <Dialog
          open={!!prompt}
          onClose={() => handlePromptResult(false)}
          PaperProps={{
            style: {
              background: "var(--background-medium)",
              color: "var(--text-color-primary)",
              borderRadius: 12,
              boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
              minWidth: 320,
            }
          }}
        >
          <DialogTitle style={{ color: "var(--text-color-primary)" }}>Confirmation</DialogTitle>
          <DialogContent>
            <DialogContentText style={{ color: "var(--text-color-primary)", fontSize: 18 }}>
              {prompt.message}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              variant="contained"
              color="success"
              onClick={() => handlePromptResult(true)}
              style={{ fontWeight: 700, background: "#4caf50", color: "#fff", borderRadius: 4 }}
            >
              Buy
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => handlePromptResult(false)}
              style={{ fontWeight: 700, background: "#f44336", color: "#fff", borderRadius: 4 }}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      )}
      {/* Alert overlay */}
      {alert && (
        <Dialog
          open={!!alert}
          onClose={() => setAlert(null)}
          PaperProps={{
            style: {
              background: "var(--background-medium)",
              color: "var(--text-color-primary)",
              borderRadius: 12,
              boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
              minWidth: 320,
            }
          }}
        >
          <DialogTitle style={{ color: "var(--text-color-primary)" }}>Alert</DialogTitle>
          <DialogContent>
            <Alert severity="error" style={{ background: "transparent", color: "var(--error-color)", fontWeight: 700 }}>
              {alert.message}
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button
              variant="contained"
              color="success"
              onClick={() => setAlert(null)}
              style={{ fontWeight: 700, background: "#4caf50", color: "#fff", borderRadius: 4 }}
            >
              OK
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}

// Version Mobile
function ShopMobile(props: any) {
  const {
    games,
    loading,
    error,
    prompt,
    alert,
    handleBuyGame,
    setAlert,
    setPrompt,
    isLauncher,
    ownerInfoMap,
  } = props;

  const { skeletons, handlePromptResult } = props;
  return (
    <div className="shop-root">
      <div
        className="shop-games-section"
        style={{
          padding: 0,
          background: "none",
          border: "none",
          boxShadow: "none",
          overflowY: "auto",
          maxHeight: "calc(100vh - 120px)",
        }}
      >
        {loading && (
          <div style={{ position: "relative" }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "32px",
                justifyContent: "center",
                marginTop: 24,
                filter: "blur(0.5px) grayscale(0.2) brightness(0.8)",
                pointerEvents: "none",
                width: "95vw",
              }}
            >
              {skeletons}
            </div>
            <div className="gamepage-loading-overlay">
              <div className="inventory-loading-spinner" />
            </div>
          </div>
        )}
        {error && <div className="shop-error">{error}</div>}
        {games.length === 0 && !loading && !error && (
          <div className="shop-games-empty">No games available.</div>
        )}
        {!loading && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "32px",
              justifyContent: "center",
              marginTop: 24,
            }}
          >
            {games
              .slice()
              .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
              .map((game) => {
                const ownerId = game.owner_id;
                const ownerInfo = ownerId ? ownerInfoMap[ownerId] : null;
                return (
                  <div
                    key={game.gameId}
                    className="shop-game-modern-card"
                    style={{
                      width: "90vw",
                      background: "var(--background-medium)",
                      borderRadius: 16,
                      boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
                      overflow: "hidden",
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      marginBottom: 24,
                      border: "2px solid var(--border-color)",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: 160,
                        background: "#18181c",
                      }}
                    >
                      <img
                        src={"/banners-icons/" + game?.bannerHash}
                        alt="banner"
                        style={{
                          width: "100%",
                          height: "100%",
                          maxWidth: "100%",
                          objectFit: "cover",
                          opacity: 0.52,
                          position: "absolute",
                          left: 0,
                          top: 0,
                          zIndex: 0,
                        }}
                      />
                      <img
                        src={"/games-icons/" + game.iconHash}
                        alt={game.name}
                        style={{
                          width: 96,
                          height: 96,
                          objectFit: "contain",
                          borderRadius: 16,
                          background: "#23232a",
                          border: "2px solid #888",
                          position: "absolute",
                          left: 32,
                          bottom: -48,
                          zIndex: 2,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        padding: "56px 32px 24px 32px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        position: "relative",
                        minHeight: 160,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          marginBottom: 4,
                          color: "var(--text-color-primary)",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Link
                          href={`/game?gameId=${game.gameId}${isLauncher ? "&from=launcher" : ""}`}
                          className="shop-game-link"
                          style={{ color: "white", textDecoration: "none" }}
                        >
                          {game.name}
                        </Link>
                        <span
                          style={{
                            fontSize: 15,
                            color: "var(--text-color-secondary)",
                            fontWeight: 400,
                            marginLeft: 8,
                          }}
                        >
                          {game.genre}
                        </span>
                      </div>
                      {/* --- Affichage propriétaire --- */}
                      {ownerInfo && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, justifyContent: "space-between" }}>
                          <a
                            href={`/profile?user=${ownerInfo.id}`}
                            style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "#fff" }}
                          >
                            <CachedImage
                              src={`/avatar/${ownerInfo.id}`}
                              alt={ownerInfo.username}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                marginRight: 8,
                                objectFit: "cover",
                                border: "2px solid #444"
                              }}
                            />
                            <span style={{ fontWeight: 500 }}>
                              {ownerInfo.username}
                              <Certification
                                user={ownerInfo}
                                style={{
                                  marginLeft: 4,
                                  width: 16,
                                  height: 16,
                                  position: "relative",
                                  top: -2,
                                  verticalAlign: "middle",
                                }}
                              />
                            </span>
                          </a>
                          <div
                            style={{
                              color: "var(--gold-color)",
                              fontWeight: 700,
                              fontSize: 18,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            {game.price}
                            <CachedImage
                              src="/assets/credit.png"
                              className="shop-credit-icon"
                              alt="credits"
                            />
                          </div>
                        </div>
                      )}
                      {/* --- Fin propriétaire --- */}
                      <div
                        style={{
                          color: "var(--text-color-secondary)",
                          fontSize: 15,
                          marginBottom: 6,
                          minHeight: 38,
                          maxHeight: 38,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {game.description}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
      {/* Prompt overlay for games */}
      {prompt && (
        <Dialog
          open={!!prompt}
          onClose={() => handlePromptResult(false)}
          PaperProps={{
            style: {
              background: "var(--background-medium)",
              color: "var(--text-color-primary)",
              borderRadius: 12,
              boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
              minWidth: 320,
            }
          }}
        >
          <DialogTitle style={{ color: "var(--text-color-primary)" }}>Confirmation</DialogTitle>
          <DialogContent>
            <DialogContentText style={{ color: "var(--text-color-primary)", fontSize: 18 }}>
              {prompt.message}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              variant="contained"
              color="success"
              onClick={() => handlePromptResult(true)}
              style={{ fontWeight: 700, background: "#4caf50", color: "#fff", borderRadius: 4 }}
            >
              Buy
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => handlePromptResult(false)}
              style={{ fontWeight: 700, background: "#f44336", color: "#fff", borderRadius: 4 }}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      )}
      {/* Alert overlay */}
      {alert && (
        <Dialog
          open={!!alert}
          onClose={() => setAlert(null)}
          PaperProps={{
            style: {
              background: "var(--background-medium)",
              color: "var(--text-color-primary)",
              borderRadius: 12,
              boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
              minWidth: 320,
            }
          }}
        >
          <DialogTitle style={{ color: "var(--text-color-primary)" }}>Alert</DialogTitle>
          <DialogContent>
            <Alert severity="error" style={{ background: "transparent", color: "var(--error-color)", fontWeight: 700 }}>
              {alert.message}
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button
              variant="contained"
              color="success"
              onClick={() => setAlert(null)}
              style={{ fontWeight: 700, background: "#4caf50", color: "#fff", borderRadius: 4 }}
            >
              OK
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}

export default function Shop() {
  const isMobile = useIsMobile();
  const shop = useShopLogic();
  return isMobile ? <ShopMobile {...shop} /> : <ShopDesktop {...shop} />;
}
