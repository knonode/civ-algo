export class ToolTip {
    constructor() {
        this.toolTipElement = document.createElement('div');

        this.toolTipElement.id = 'tooltip';

        Object.assign(this.toolTipElement.style, {
            position: 'absolute',
            zIndex: '100',
            pointerEvents: 'none',
            padding: '4px 8px',
            backgroundColor: 'rgba(0,0,0)',
            color: '#fff',
            fontFamily: 'monospace',
            display: 'none'
        });

        document.body.appendChild(this.toolTipElement);
    }

    showTooltip(e, text) {
        this.toolTipElement.textContent = text;
        this.toolTipElement.style.left = `${e.x}px`;
        this.toolTipElement.style.top = `${e.y}px`;
        this.toolTipElement.style.display = 'block';
    }

    hideTooltip() {
        this.toolTipElement.style.display = 'none';
    }
}
