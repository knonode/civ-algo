export class Controls {
    constructor(
        container,
        {
            dragDeadZone = 4,
            onDrag,
            onClick,
            onWheel,
            onResize,
            onHover,
            inertia = true,
            inertiaDecay = 0,            // 0..1, closer to 1 = longer coast
            inertiaMinSpeed = 0.02,      // px/ms threshold to stop
            pinchToWheelScale = -320,    // factor converting pinch scale delta -> wheel deltaY
            doubleTapZoomDelta = -160,   // deltaY for double-tap zoom in
            doubleTapMs = 300,           // max ms between taps
            hoverThrottleMs = 10,        // new: throttle interval for hover callbacks

        } = {},


    ) {
        this._suppressTapUntilTs = 0; // swallow taps for a bit after pinch
        this.container = container;
        this.dragDeadZone = dragDeadZone;
        this.onDrag = onDrag;
        this.onClick = onClick;
        this.onWheel = onWheel;
        this.onHover = onHover; // store
        this.onResize = onResize;
        this.hoverThrottleMs = hoverThrottleMs;

        // options
        this.inertiaEnabled = inertia;
        this.inertiaDecay = inertiaDecay;
        this.inertiaMinSpeed = inertiaMinSpeed;
        this.pinchToWheelScale = pinchToWheelScale;
        this.doubleTapZoomDelta = doubleTapZoomDelta;
        this.doubleTapMs = doubleTapMs;

        // mouse state
        this.dragStart = null;
        this.dragging = false;

        // touch/pointer state
        this.activePointers = new Map(); // pointerId -> { x, y }
        this.primaryPointerId = null;
        this.pinchStartDist = null;
        this.pinchLastScale = 1;
        this.isPinching = false;
        this.pinchPointerIds = [];

        // gesture helpers
        this._lastMoveSample = null;     // { t, x, y }
        this._prevMoveSample = null;     // previous sample for velocity
        this._inertiaRAF = null;
        this._inertiaVel = { vx: 0, vy: 0 }; // px/ms
        this._suppressMouseUntilTs = 0;  // suppress ghost mouse after touch
        this._lastTap = { t: 0, x: 0, y: 0 };

        // Track a short window of recent move samples for better inertia direction
        this._moveSamples = [];

        // hover throttle helpers
        this._lastHoverTs = 0;
        this._pendingHover = null; // { x, y, event }
        this._hoverTimeout = null;

        // binders
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onWheel = this._onWheel.bind(this);
        this._onResize = this._onResize.bind(this);

        this._onPointerDown = this._onPointerDown.bind(this);
        this._onPointerMove = this._onPointerMove.bind(this);
        this._onPointerUp = this._onPointerUp.bind(this);
        this._onPointerCancel = this._onPointerCancel.bind(this);

        this._onBlur = this._onBlur.bind(this);
        this._onVisibilityChange = this._onVisibilityChange.bind(this);

        // Mouse listeners (kept for non-pointer devices)
        container.addEventListener('mousedown', this._onMouseDown);
        container.addEventListener('mousemove', this._onMouseMove);
        window.addEventListener('mouseup', this._onMouseUp);
        container.addEventListener('wheel', this._onWheel, { passive: false });
        window.addEventListener('resize', this._onResize);

        // Pointer listeners (touch/pen/mouse unified)
        if (!container.style.touchAction) container.style.touchAction = 'none';
        container.addEventListener('pointerdown', this._onPointerDown);
        container.addEventListener('pointermove', this._onPointerMove, { passive: false });
        window.addEventListener('pointerup', this._onPointerUp);
        window.addEventListener('pointercancel', this._onPointerCancel);

        // Focus/visibility cleanup
        window.addEventListener('blur', this._onBlur);
        document.addEventListener('visibilitychange', this._onVisibilityChange);
    }

    // -------- Helpers --------
    _now() { return performance.now(); }

    _emitHover(x, y, event) {
        if (!this.onHover) return;
        const now = this._now();
        const elapsed = now - this._lastHoverTs;
        if (elapsed >= this.hoverThrottleMs) {
            this._lastHoverTs = now;
            this.onHover({ clientX: x, clientY: y, event });
        } else {
            // schedule trailing call
            this._pendingHover = { x, y, event };
            if (!this._hoverTimeout) {
                this._hoverTimeout = setTimeout(() => {
                    this._hoverTimeout = null;
                    if (this._pendingHover) {
                        const { x: px, y: py, event: pe } = this._pendingHover;
                        this._pendingHover = null;
                        this._lastHoverTs = this._now();
                        this.onHover({ clientX: px, clientY: py, event: pe });
                    }
                }, this.hoverThrottleMs - elapsed);
            }
        }
    }

    _clearHoverPending() {
        if (this._hoverTimeout) {
            clearTimeout(this._hoverTimeout);
            this._hoverTimeout = null;
        }
        this._pendingHover = null;
    }

    _startDragAt(x, y) {
        this._stopInertia();
        this.dragStart = { x, y };
        this.dragging = false;
        this._prevMoveSample = null;
        this._lastMoveSample = { t: this._now(), x, y };

        // seed samples window
        this._moveSamples.length = 0;
        this._moveSamples.push(this._lastMoveSample);

        // during drag we don't want pending hover to fire
        this._clearHoverPending();
    }

    _updateDrag(x, y, event) {
        if (!this.dragStart) return;

        const dx = x - this.dragStart.x;
        const dy = y - this.dragStart.y;
        const distance2 = dx * dx + dy * dy;

        if (!this.dragging && distance2 > this.dragDeadZone ** 2) this.dragging = true;
        if (!this.dragging) return;

        if (this.onDrag) this.onDrag({ dx, dy, event });

        // shift start point so next frame reports incremental deltas
        this.dragStart = { x, y };

        // capture samples for velocity (keep ~120ms window)
        const now = this._now();
        this._prevMoveSample = this._lastMoveSample;
        this._lastMoveSample = { t: now, x, y };
        this._moveSamples.push(this._lastMoveSample);
        const horizonMs = 120;
        while (this._moveSamples.length > 1 && (now - this._moveSamples[0].t) > horizonMs) {
            this._moveSamples.shift();
        }
    }

    _endDragForClickOrTap(x, y, event) {
        // Decide between double-tap zoom (touch) and click
        const pointerType = event && event.pointerType;
        if (pointerType === 'touch') {
            const didZoom = this._registerTapAndMaybeZoom(x, y, event);
            if (!didZoom && this.onClick) this.onClick({ clientX: x, clientY: y, event });
        } else {
            if (this.onClick) this.onClick({ clientX: x, clientY: y, event });
        }

        this.dragStart = null;
        this.dragging = false;
        this._prevMoveSample = null;
        this._lastMoveSample = null;
    }

    _computeVelocity() {
        // Average over a short window to avoid "snap-back" from the final tiny reverse move
        if (!this._lastMoveSample || this._moveSamples.length < 2) return { vx: 0, vy: 0 };
        const last = this._lastMoveSample;
        // pick the oldest sample in the window as baseline
        const first = this._moveSamples[0];
        const dt = Math.max(1, last.t - first.t);
        return { vx: (last.x - first.x) / dt, vy: (last.y - first.y) / dt };
    }

    _startInertia() {
        if (!this.inertiaEnabled) return;
        const { vx, vy } = this._computeVelocity();
        const speed = Math.hypot(vx, vy);
        if (speed < this.inertiaMinSpeed) return;

        this._inertiaVel = { vx, vy };
        let last = this._now();

        const step = () => {
            const now = this._now();
            const dt = now - last;
            last = now;

            // apply movement based on current velocity (px/ms * ms)
            const dx = this._inertiaVel.vx * dt;
            const dy = this._inertiaVel.vy * dt;

            if (this.onDrag) this.onDrag({ dx, dy, event: null });

            // decay velocity with time-scaled factor
            const decayPer16 = this.inertiaDecay; // decay factor per ~16ms
            const decay = Math.pow(decayPer16, dt / 16);
            this._inertiaVel.vx *= decay;
            this._inertiaVel.vy *= decay;

            if (Math.hypot(this._inertiaVel.vx, this._inertiaVel.vy) < this.inertiaMinSpeed) {
                this._inertiaRAF = null;
                return;
            }
            this._inertiaRAF = requestAnimationFrame(step);
        };

        this._inertiaRAF = requestAnimationFrame(step);
    }

    _stopInertia() {
        if (this._inertiaRAF) {
            cancelAnimationFrame(this._inertiaRAF);
            this._inertiaRAF = null;
        }
        this._inertiaVel.vx = 0;
        this._inertiaVel.vy = 0;
    }

    _registerTapAndMaybeZoom(x, y, event) {
        // returns true if a double-tap zoom was performed
        const now = this._now();
        const { t: lastT, x: lastX, y: lastY } = this._lastTap;
        const withinTime = now - lastT <= this.doubleTapMs;
        const withinDist = Math.hypot(x - lastX, y - lastY) <= 12;
        if (withinTime && withinDist) {
            if (this.onWheel) this.onWheel({ deltaY: this.doubleTapZoomDelta, event });
            this._lastTap = { t: 0, x: 0, y: 0 }; // reset
            return true;
        } else {
            this._lastTap = { t: now, x, y };
            return false;
        }
    }

    _onMouseDown(e) {
        if (this._now() < this._suppressMouseUntilTs) return;
        this._startDragAt(e.clientX, e.clientY);
    }
    _onMouseMove(e) {
        if (this._now() < this._suppressMouseUntilTs) return;
        if (this.dragStart) this._updateDrag(e.clientX, e.clientY, e);
        if (!this.dragging && this.onHover) this._emitHover(e.clientX, e.clientY, e);
    }
    _onMouseUp(e) {
        if (this._now() < this._suppressMouseUntilTs) return;
        const wasDragging = this.dragging;
        const x = e.clientX, y = e.clientY;
        if (!wasDragging && this.dragStart) {
            this._endDragForClickOrTap(x, y, e);
        } else {
            // finalize drag then inertia
            this.dragStart = null;
            this.dragging = false;
            if (wasDragging) this._startInertia();
        }
    }
    _onWheel(e) {
        if (this.onWheel) this.onWheel({ deltaY: e.deltaY, event: e });
    }
    _onResize() {
        if (this.onResize) this.onResize();
    }

    _onPointerDown(e) {
        this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (e.pointerType !== 'mouse') this._suppressMouseUntilTs = this._now() + 500;

        if (this.activePointers.size === 1) {

            this.primaryPointerId = e.pointerId;
            this._startDragAt(e.clientX, e.clientY);
        } else if (this.activePointers.size === 2 && !this.isPinching) {
            const ids = [...this.activePointers.keys()];
            const idA = ids[0], idB = ids[1];
            const a = this.activePointers.get(idA);
            const b = this.activePointers.get(idB);
            this.pinchPointerIds = [idA, idB];
            this.pinchStartDist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
            this.pinchLastScale = 1;
            this.isPinching = true;
            this.dragStart = null;
            this.dragging = false;
            this._prevMoveSample = null;
            this._lastMoveSample = null;
            this._moveSamples.length = 0;
            this._clearHoverPending();
        }
    }

    _onPointerMove(e) {
        if (!this.activePointers.has(e.pointerId)) return;
        this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        // Pinch zoom (tracked pair)
        if (this.isPinching) {
            const [idA, idB] = this.pinchPointerIds;
            const a = this.activePointers.get(idA);
            const b = this.activePointers.get(idB);
            if (!a || !b || !this.pinchStartDist) return;
            const dist = Math.hypot(b.x - a.x, b.y - a.y);
            if (dist > 0) {
                const scale = dist / this.pinchStartDist;
                // Use log-scaled delta to avoid sudden jumps; clamp to tame spikes
                let delta = Math.log2(scale) - Math.log2(this.pinchLastScale);
                if (!Number.isFinite(delta)) delta = 0;
                const clamp = 0.5; // about one half step per frame
                if (delta > clamp) delta = clamp; else if (delta < -clamp) delta = -clamp;
                if (Math.abs(delta) > 1e-4) {
                    const syntheticDeltaY = delta * this.pinchToWheelScale; // pinch-out -> negative (zoom in)
                    if (this.onWheel) this.onWheel({ deltaY: syntheticDeltaY, event: e });
                }
                this.pinchLastScale = scale;
                e.preventDefault();
            }
            return;
        }

        // Single-finger drag (maps to onDrag like mouse)
        if (this.primaryPointerId === e.pointerId && this.dragStart) {
            this._updateDrag(e.clientX, e.clientY, e);
            e.preventDefault();
        }

        // Mouse hover (mouse only, not dragging)
        if (e.pointerType === 'mouse' && !this.dragging && !this.isPinching && this.onHover) {
            this._emitHover(e.clientX, e.clientY, e);
        }
    }

    _endPointer(e, canceled = false) {
        // handle pinch termination first to avoid inertia/click
        if (this.isPinching) {
            // If one of the pinch pointers ended or we have < 2 pointers, stop pinching
            if (this.pinchPointerIds.includes(e.pointerId) || this.activePointers.size < 2) {
                this.isPinching = false;
                this.pinchPointerIds = [];
                this.pinchStartDist = null;
                this.pinchLastScale = 1;

                // Do NOT continue as drag; swallow the next tap/click briefly
                this._suppressTapUntilTs = this._now() + 400; // ms
                this.activePointers.delete(e.pointerId);
                this.primaryPointerId = null;
                this.dragStart = null;
                this.dragging = false;
                this._prevMoveSample = null;
                this._lastMoveSample = null;
                this._moveSamples.length = 0;
                return;
            }
        }

        const wasPrimary = e.pointerId === this.primaryPointerId;

        this.activePointers.delete(e.pointerId);

        // If we ended a pinch (fallback)
        if (this.activePointers.size < 2) {
            this.pinchStartDist = null;
            this.pinchLastScale = 1;
        }

        // End of single-finger interaction -> possible click / inertia / double-tap
        if (wasPrimary) {
            const wasDragging = this.dragging;
            const x = e.clientX, y = e.clientY;
            if (!canceled) {
                if (wasDragging) {
                    this.dragStart = null;
                    this.dragging = false;
                    this._startInertia();

                } else {
                    // swallow tap if we just pinched
                    if (this._now() < this._suppressTapUntilTs) {
                        this._suppressTapUntilTs = 0;
                        this.dragStart = null;
                        this.dragging = false;
                    } else {
                        this._endDragForClickOrTap(x, y, e);
                    }
                }
            } else {
                // canceled -> just reset
                this.dragStart = null;
                this.dragging = false;
            }
            this.primaryPointerId = null;
        }
    }

    _onPointerUp(e) {
        this._endPointer(e, false);
    }

    _onPointerCancel(e) {
        this._endPointer(e, true);
    }

    // -------- Focus/visibility --------
    _onBlur() {
        this._cancelAllInteractions();
    }
    _onVisibilityChange() {
        if (document.visibilityState === 'hidden') this._cancelAllInteractions();
    }
    _cancelAllInteractions() {
        this.dragStart = null;
        this.dragging = false;
        this.activePointers.clear();
        this.primaryPointerId = null;
        this.pinchStartDist = null;
        this.pinchLastScale = 1;
        this.pinchPointerIds = [];
        this.isPinching = false;
        this._prevMoveSample = null;
        this._lastMoveSample = null;
        this._moveSamples.length = 0;
        this._stopInertia();
        this._clearHoverPending();
    }

    // -------- Cleanup --------
    dispose() {
        this.container.removeEventListener('mousedown', this._onMouseDown);
        this.container.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('mouseup', this._onMouseUp);
        this.container.removeEventListener('wheel', this._onWheel);
        window.removeEventListener('resize', this._onResize);

        this.container.removeEventListener('pointerdown', this._onPointerDown);
        this.container.removeEventListener('pointermove', this._onPointerMove);
        window.removeEventListener('pointerup', this._onPointerUp);
        window.removeEventListener('pointercancel', this._onPointerCancel);

        window.removeEventListener('blur', this._onBlur);
        document.removeEventListener('visibilitychange', this._onVisibilityChange);
        this._clearHoverPending();
    }
}
