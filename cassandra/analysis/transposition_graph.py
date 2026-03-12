"""
Transposition Graph

Instead of thinking of chess as a tree (each opening is a unique path),
we model it as a directed graph where positions are nodes and moves are edges.
Transpositions are simply two paths converging to the same node.

This lets us answer questions like:
- "How many distinct openings lead to the same position by move 10?"
- "What percentage of Sicilian Defense games actually transpose into
   positions reachable via the French Defense?"
- "Which positions are the highest-traffic 'hubs' that many openings funnel through?"

These hub positions are the "Pareto positions" — master these and you
cover a disproportionate fraction of games.
"""

import logging
from dataclasses import dataclass, field
from typing import Optional
from collections import defaultdict

logger = logging.getLogger(__name__)


@dataclass
class GraphNode:
    """A position in the transposition graph."""
    position_hash: str
    fen: str
    total_visits: int = 0  # How many games pass through this position
    unique_paths_in: int = 0  # How many distinct move sequences reach this position
    unique_paths_out: int = 0  # How many distinct moves are played from here
    opening_labels: set = field(default_factory=set)  # ECO codes that reach this position
    avg_move_number: float = 0.0  # Average move number when this position occurs
    is_hub: bool = False  # Identified as a Pareto hub

    @property
    def transposition_factor(self) -> float:
        """
        How "transposition-rich" is this position?
        High value = many different opening paths converge here.
        """
        if self.unique_paths_in <= 1:
            return 0.0
        return self.unique_paths_in / max(self.total_visits, 1)


@dataclass
class GraphEdge:
    """A move connecting two positions."""
    from_hash: str
    to_hash: str
    move_uci: str
    move_san: str
    frequency: int = 0  # How many times this move was played
    win_rate: float = 0.0


@dataclass
class TranspositionCluster:
    """A group of openings that frequently transpose to the same position."""
    hub_position_hash: str
    hub_fen: str
    openings: list[dict] = field(default_factory=list)
    # Each: {"eco": str, "name": str, "games_reaching_hub": int, "avg_moves_to_hub": float}
    total_games: int = 0
    insight: str = ""


class TranspositionGraph:
    """
    Builds and queries the position-level transposition graph.

    Usage:
        graph = TranspositionGraph(database)
        graph.build(max_depth=20)

        # Find hub positions
        hubs = graph.find_hubs(min_visits=1000, min_paths_in=3)

        # Find transposition clusters
        clusters = graph.find_transposition_clusters()

        # Challenge opening attribution
        report = graph.opening_attribution_report("B90")  # Sicilian Najdorf
    """

    def __init__(self, database):
        self.db = database
        self.nodes: dict[str, GraphNode] = {}
        self.edges: dict[tuple[str, str], GraphEdge] = {}
        self._adjacency: dict[str, set[str]] = defaultdict(set)  # hash -> set of successor hashes
        self._reverse_adj: dict[str, set[str]] = defaultdict(set)  # hash -> set of predecessor hashes

    def build(self, max_depth: int = 20, elo_bracket: Optional[str] = None):
        """
        Build the transposition graph from the database.

        Scans all stored games, extracts position sequences up to max_depth,
        and constructs the graph.
        """
        session = self.db.get_session()
        try:
            from ..data.db import Position, Game

            query = session.query(Position).filter(
                Position.move_number <= max_depth
            ).order_by(Position.game_id, Position.move_number)

            current_game_id = None
            prev_hash = None
            game_eco = ""

            for pos in query.yield_per(10000):
                # Track position nodes
                if pos.position_hash not in self.nodes:
                    self.nodes[pos.position_hash] = GraphNode(
                        position_hash=pos.position_hash,
                        fen=pos.fen,
                    )

                node = self.nodes[pos.position_hash]
                node.total_visits += 1

                # Track opening label
                if pos.game_id != current_game_id:
                    current_game_id = pos.game_id
                    prev_hash = None
                    game = session.query(Game).get(pos.game_id)
                    game_eco = game.opening_eco if game else ""

                if game_eco:
                    node.opening_labels.add(game_eco)

                # Track edges (move transitions)
                if prev_hash and prev_hash != pos.position_hash:
                    edge_key = (prev_hash, pos.position_hash)
                    if edge_key not in self.edges:
                        self.edges[edge_key] = GraphEdge(
                            from_hash=prev_hash,
                            to_hash=pos.position_hash,
                            move_uci=pos.move_played_uci,
                            move_san=pos.move_played_san,
                        )
                    self.edges[edge_key].frequency += 1

                    self._adjacency[prev_hash].add(pos.position_hash)
                    self._reverse_adj[pos.position_hash].add(prev_hash)

                prev_hash = pos.position_hash

            # Compute derived metrics
            for node_hash, node in self.nodes.items():
                node.unique_paths_in = len(self._reverse_adj.get(node_hash, set()))
                node.unique_paths_out = len(self._adjacency.get(node_hash, set()))

            logger.info(
                f"Graph built: {len(self.nodes)} positions, {len(self.edges)} edges"
            )

        finally:
            session.close()

    def find_hubs(
        self,
        min_visits: int = 100,
        min_paths_in: int = 2,
        min_openings: int = 2,
        top_n: int = 50,
    ) -> list[GraphNode]:
        """
        Find "Pareto hub" positions — high-traffic nodes with multiple
        incoming paths from different openings.

        These are the positions worth mastering: they appear in many
        games across many openings.
        """
        hubs = []
        for node in self.nodes.values():
            if (
                node.total_visits >= min_visits
                and node.unique_paths_in >= min_paths_in
                and len(node.opening_labels) >= min_openings
            ):
                node.is_hub = True
                hubs.append(node)

        # Sort by visit count (most important first)
        hubs.sort(key=lambda n: n.total_visits, reverse=True)
        return hubs[:top_n]

    def find_transposition_clusters(self, min_openings: int = 3) -> list[TranspositionCluster]:
        """
        Find positions where multiple openings converge.
        Returns clusters of openings that frequently transpose.
        """
        clusters = []
        hubs = self.find_hubs(min_openings=min_openings)

        for hub in hubs:
            cluster = TranspositionCluster(
                hub_position_hash=hub.position_hash,
                hub_fen=hub.fen,
                total_games=hub.total_visits,
            )

            for eco in hub.opening_labels:
                cluster.openings.append({
                    "eco": eco,
                    "name": "",  # Would need ECO lookup table
                    "games_reaching_hub": 0,  # Would need per-opening counting
                    "avg_moves_to_hub": 0.0,
                })

            cluster.insight = (
                f"This position is reached by {len(hub.opening_labels)} different openings "
                f"across {hub.total_visits} games. Traditional opening attribution "
                f"may overcount win rates for specific openings when the position is "
                f"actually reached via transposition."
            )
            clusters.append(cluster)

        return clusters

    def opening_attribution_report(self, eco_code: str) -> dict:
        """
        Analyze how often games labeled as a specific opening
        actually transpose to/from other openings.

        Challenges the naive "opening X has Y% win rate" claim.
        """
        positions_in_opening = []
        transposition_positions = []

        for node in self.nodes.values():
            if eco_code in node.opening_labels:
                positions_in_opening.append(node)
                if len(node.opening_labels) > 1:
                    transposition_positions.append(node)

        total_positions = len(positions_in_opening)
        transposed = len(transposition_positions)

        other_openings = set()
        for node in transposition_positions:
            other_openings.update(node.opening_labels - {eco_code})

        return {
            "eco": eco_code,
            "total_positions_analyzed": total_positions,
            "positions_with_transpositions": transposed,
            "transposition_rate": transposed / max(total_positions, 1),
            "transposes_with_openings": sorted(other_openings),
            "insight": (
                f"{transposed}/{total_positions} positions labeled as {eco_code} "
                f"are also reachable via {len(other_openings)} other openings. "
                f"Win rate attribution for {eco_code} may be misleading."
            ),
        }
