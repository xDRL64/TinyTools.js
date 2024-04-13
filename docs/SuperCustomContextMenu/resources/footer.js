const append_footer = ()=>{
    let s;
    const SCCM_licence = '© [free licence] SCCM';
    const extlib_credit = 'All Code Examples are highlighted with Prism.js';
    const {body} = document;

    // footer elem
    const footer = document.createElement('div');
    s = footer.style;
    s.position = 'fixed';
    s.display = 'flex';
    s.justifyContent = 'space-between';
    s.bottom = '0px';
    s.width = '100%';
    s.left = '0px';
    s.backgroundColor = 'white';
    s.borderTop = '1px solid black';

    // footer content elem
    const make_footelem = (content)=>{
        const elem = document.createElement('span');
        s = elem.style;
        s.padding = '2px 16px';
        elem.textContent = content;
        return elem;
    };
    const leftElem = make_footelem(SCCM_licence);
    const rightElem = make_footelem(extlib_credit);

    // add footer to page
    footer.appendChild(leftElem);
    footer.appendChild(rightElem);
    body.appendChild(footer);

    // generate footer's bounding space
    // (fixes footer overlapping on page's content at end of scroll)
    const footerHeight = footer.getBoundingClientRect().height;
    const bodyMargin = parseInt(getComputedStyle(body).marginBottom);
    const boundHeight = footerHeight - bodyMargin;
    const heightBound = document.createElement('div');
    s = heightBound.style;
    s.position = 'relative';
    s.inset = 'auto 0px 0px 0px';
    s.height = boundHeight + 'px';
    body.appendChild(heightBound);
};