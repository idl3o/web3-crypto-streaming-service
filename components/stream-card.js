class StreamCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    async connectedCallback() {
        this.contentId = this.getAttribute('content-id');
        this.render();
        await this.loadPreview();
    }

    async loadPreview() {
        if (!this.contentId) return;

        const preview = document.createElement('div');
        preview.className = 'preview';
        preview.innerHTML = `
            <div class="loading">Loading preview...</div>
        `;

        this.shadowRoot.querySelector('.stream-card').appendChild(preview);
    }

    render() {
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          border-radius: var(--harmony-radius, 8px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .stream-card {
          padding: 16px;
          background-color: #fff;
        }
        .preview {
          margin-top: 8px;
          min-height: 100px;
          background: #f5f5f5;
          border-radius: 4px;
        }
        .loading {
          padding: 16px;
          text-align: center;
          color: #666;
        }
      </style>
      <div class="stream-card">
        <slot></slot>
      </div>
    `;
    }
}

customElements.define('stream-card', StreamCard);
