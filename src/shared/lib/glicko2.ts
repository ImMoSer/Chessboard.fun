export interface GlickoState {
  rating: number;
  rd: number;
  vol: number;
}

export class Glicko2Calculator {
  private readonly TAU = 0.5;
  private readonly CONVERSION_FACTOR = 173.7178;

  private toGlicko2Scale(rating: number, rd: number) {
    return {
      mu: (rating - 1500) / this.CONVERSION_FACTOR,
      phi: rd / this.CONVERSION_FACTOR,
    };
  }

  private fromGlicko2Scale(mu: number, phi: number) {
    return {
      rating: Math.round(1500 + mu * this.CONVERSION_FACTOR),
      rd: Math.round(phi * this.CONVERSION_FACTOR),
    };
  }

  private g(phi: number): number {
    return 1 / Math.sqrt(1 + (3 * Math.pow(phi, 2)) / Math.pow(Math.PI, 2));
  }

  private E(mu: number, mu_j: number, phi_j: number): number {
    return 1 / (1 + Math.exp(-this.g(phi_j) * (mu - mu_j)));
  }

  private f(x: number, delta_sq: number, phi_sq: number, v: number, a: number): number {
    const e_x = Math.exp(x);
    const term1 = (e_x * (delta_sq - phi_sq - v - e_x)) / (2 * Math.pow(phi_sq + v + e_x, 2));
    const term2 = (x - a) / (this.TAU * this.TAU);
    return term1 - term2;
  }

  public calculate(
    player: GlickoState,
    opponents: Array<{ rating: number; rd: number }>,
    scores: number[],
  ): GlickoState {
    const { mu, phi } = this.toGlicko2Scale(player.rating, player.rd);
    const vol = player.vol;

    if (opponents.length === 0) {
      const newPhi = Math.sqrt(phi * phi + vol * vol);
      const newRating = this.fromGlicko2Scale(mu, newPhi);
      return { rating: newRating.rating, rd: newRating.rd, vol: vol };
    }

    let v_inv = 0;
    for (let i = 0; i < opponents.length; i++) {
      const opp = opponents[i];
      if (!opp) continue;
      
      const opponent = this.toGlicko2Scale(opp.rating, opp.rd);
      const g_phi_j = this.g(opponent.phi);
      const E_val = this.E(mu, opponent.mu, opponent.phi);
      v_inv += g_phi_j * g_phi_j * E_val * (1 - E_val);
    }
    const v = 1 / v_inv;

    let delta = 0;
    for (let i = 0; i < opponents.length; i++) {
      const opp = opponents[i];
      const score = scores[i];
      if (!opp || score === undefined) continue;
      
      const opponent = this.toGlicko2Scale(opp.rating, opp.rd);
      delta += this.g(opponent.phi) * (score - this.E(mu, opponent.mu, opponent.phi));
    }
    delta *= v;

    const a = Math.log(vol * vol);
    const delta_sq = delta * delta;
    const phi_sq = phi * phi;
    let A = a;
    let B: number;

    if (delta_sq > phi_sq + v) {
      B = Math.log(delta_sq - phi_sq - v);
    } else {
      let k = 1;
      while (this.f(a - k * this.TAU, delta_sq, phi_sq, v, a) < 0) {
        k++;
      }
      B = a - k * this.TAU;
    }

    let fA = this.f(A, delta_sq, phi_sq, v, a);
    let fB = this.f(B, delta_sq, phi_sq, v, a);
    const epsilon = 0.000001;

    while (Math.abs(B - A) > epsilon) {
      const C = A + ((A - B) * fA) / (fB - fA);
      const fC = this.f(C, delta_sq, phi_sq, v, a);
      if (fC * fB < 0) {
        A = B;
        fA = fB;
      } else {
        fA /= 2;
      }
      B = C;
      fB = fC;
    }
    const newVol = Math.exp(A / 2);

    const preRatingPhi = Math.sqrt(phi_sq + newVol * newVol);
    const newPhi = 1 / Math.sqrt(1 / (preRatingPhi * preRatingPhi) + 1 / v);

    let newMu = 0;
    for (let i = 0; i < opponents.length; i++) {
      const opp = opponents[i];
      const score = scores[i];
      if (!opp || score === undefined) continue;

      const opponent = this.toGlicko2Scale(opp.rating, opp.rd);
      newMu += this.g(opponent.phi) * (score - this.E(mu, opponent.mu, opponent.phi));
    }
    newMu = mu + newPhi * newPhi * newMu;

    const newRating = this.fromGlicko2Scale(newMu, newPhi);
    return { rating: newRating.rating, rd: newRating.rd, vol: newVol };
  }
}
