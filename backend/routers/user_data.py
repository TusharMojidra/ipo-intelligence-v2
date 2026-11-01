import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from backend.db import get_db
from backend.models import User, UserWatchlist, SavedSimulation
from backend.schemas import (
    WatchlistCreate,
    WatchlistResponse,
    SimulationCreate,
    SimulationResponse
)
from backend.security import get_current_user

router = APIRouter(prefix="/api/user", tags=["User Data"])

# --- WATCHLIST ENDPOINTS ---

@router.get("/watchlist", response_model=List[WatchlistResponse])
def get_watchlist(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Retrieve all watchlisted IPOs for the authenticated user."""
    items = db.query(UserWatchlist).filter(UserWatchlist.user_id == current_user.id).order_by(UserWatchlist.created_at.desc()).all()
    return items


@router.post("/watchlist", response_model=WatchlistResponse, status_code=status.HTTP_201_CREATED)
def add_to_watchlist(item: WatchlistCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Add an IPO to the user's personal watchlist."""
    existing = db.query(UserWatchlist).filter(
        UserWatchlist.user_id == current_user.id,
        UserWatchlist.company_name == item.company_name.strip()
    ).first()

    if existing:
        return existing

    watchlist_entry = UserWatchlist(
        user_id=current_user.id,
        company_name=item.company_name.strip(),
        symbol=item.symbol,
        notes=item.notes
    )
    db.add(watchlist_entry)
    try:
        db.commit()
        db.refresh(watchlist_entry)
        return watchlist_entry
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="IPO already in watchlist")


@router.delete("/watchlist/{company_name}")
def remove_from_watchlist(company_name: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Remove an IPO from the user's personal watchlist by company name."""
    entry = db.query(UserWatchlist).filter(
        UserWatchlist.user_id == current_user.id,
        UserWatchlist.company_name == company_name.strip()
    ).first()

    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IPO not found in watchlist")

    db.delete(entry)
    db.commit()
    return {"message": f"Removed '{company_name}' from watchlist", "success": True}


# --- SAVED SIMULATIONS ENDPOINTS ---

@router.get("/simulations", response_model=List[SimulationResponse])
def get_saved_simulations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Retrieve all saved simulation scenarios for the authenticated user."""
    sims = db.query(SavedSimulation).filter(
        SavedSimulation.user_id == current_user.id
    ).order_by(SavedSimulation.created_at.desc()).all()

    results = []
    for s in sims:
        results.append({
            "id": s.id,
            "title": s.title,
            "inputs": json.loads(s.inputs_json),
            "results": json.loads(s.results_json),
            "created_at": s.created_at
        })
    return results


@router.post("/simulations", response_model=SimulationResponse, status_code=status.HTTP_201_CREATED)
def save_simulation(sim: SimulationCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Save an IPO simulation scenario to the user's personal vault."""
    new_sim = SavedSimulation(
        user_id=current_user.id,
        title=sim.title.strip(),
        inputs_json=json.dumps(sim.inputs),
        results_json=json.dumps(sim.results)
    )
    db.add(new_sim)
    db.commit()
    db.refresh(new_sim)

    return {
        "id": new_sim.id,
        "title": new_sim.title,
        "inputs": sim.inputs,
        "results": sim.results,
        "created_at": new_sim.created_at
    }


@router.delete("/simulations/{sim_id}")
def delete_saved_simulation(sim_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a saved simulation scenario by ID."""
    entry = db.query(SavedSimulation).filter(
        SavedSimulation.id == sim_id,
        SavedSimulation.user_id == current_user.id
    ).first()

    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulation not found")

    db.delete(entry)
    db.commit()
    return {"message": "Simulation deleted successfully", "success": True}
