// Singleton input virtual: dibaca Player tiap frame.
// Nilai -1..1, deadzone 0.15.
export const VirtualInput = {
  x: 0,
  y: 0,
  attackQueued: false,
  set(x: number, y: number) {
    // deadzone kecil agar idle stabil
    const mag = Math.hypot(x, y);
    if (mag < 0.15) {
      this.x = 0;
      this.y = 0;
    } else {
      // clamp ke lingkaran unit
      const c = mag > 1 ? 1 / mag : 1;
      this.x = x * c;
      this.y = y * c;
    }
  },
  clear() {
    this.x = 0;
    this.y = 0;
  },
  requestAttack() {
    this.attackQueued = true;
  },
  consumeAttack(): boolean {
    if (this.attackQueued) {
      this.attackQueued = false;
      return true;
    }
    return false;
  }
};
