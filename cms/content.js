/* ══════════════════════════════════════════════════════════════════════════
   content.js — the site's content model, design tokens and case-study palettes.

   GENERATED FILE. Do not edit by hand; it is rebuilt from the live site:
       python3 build/extract_svgs.py
       node build/extract_content.js
       python3 build/gen_content.py
       python3 build/make_content_js.py

   What lives here:
     SITE_CONTENT    every editable string on the portfolio, as published
     DESIGN_TOKENS   the CSS custom properties behind :root and [data-theme=dark]
     CASE_STUDIES    each case study's dark palette and its light-mode counterpart
     CASE_LIGHT_FULL the complete dark->light token table for the tokenised three
     SCHEMA          the description admin.html builds its forms from
     TOKEN_GROUPS    how the design panel groups the tokens
     EXTRA_EDITABLE  model paths edited by bespoke UI rather than a schema field
   ══════════════════════════════════════════════════════════════════════════ */

const SITE_CONTENT = {
  "meta": {
    "title": "Anupam Sarkar — Design Leader, Enterprise UX & AI",
    "description": "Anupam Sarkar — design leader working on enterprise platforms and AI-augmented design. Case studies: Smart Mining, Falcon View, Incident Management for Microsoft Teams, BT Business Billing.",
    "lang": "en"
  },
  "header": {
    "logoName": "Anupam Sarkar",
    "logoRole": "— Design Leader",
    "nav": [
      {
        "label": "Philosophy",
        "href": "#philosophy"
      },
      {
        "label": "Experience",
        "href": "#experience"
      },
      {
        "label": "Works",
        "href": "#works"
      },
      {
        "label": "AI Practices",
        "href": "#ai-practices"
      },
      {
        "label": "Contact",
        "href": "#contact"
      }
    ],
    "navMobile": [
      {
        "label": "Philosophy",
        "sub": "How I think",
        "href": "#philosophy"
      },
      {
        "label": "Experience",
        "sub": "Where I've led",
        "href": "#experience"
      },
      {
        "label": "Works",
        "sub": "Four case studies",
        "href": "#works"
      },
      {
        "label": "AI Practices",
        "sub": "Pipeline & guardrails",
        "href": "#ai-practices"
      },
      {
        "label": "Contact",
        "sub": "Say hello",
        "href": "#contact"
      }
    ],
    "themeLabelDark": "Dark"
  },
  "hero": {
    "eyebrowLeft": "Design Leader & Product Design Manager",
    "eyebrowRight": "13+ years · Enterprise UX & AI",
    "h1First": "Anupam",
    "h1Last": "Sarkar",
    "statement": "I take enterprise systems that nobody can read — billing portals, mine control rooms, hospital operations, incident response — and turn them into <span class=\"hl\">a decision someone can make before the shift ends</span>. Currently leading UX strategy for <span class=\"hl\">IBM Power Systems</span>, and building AI-augmented design practice along the way.",
    "stats": [
      {
        "value": "13+",
        "label": "Years in enterprise product design"
      },
      {
        "value": "340k",
        "label": "Businesses on systems I've redesigned"
      },
      {
        "value": "4",
        "label": "Case studies below, start to shipped"
      }
    ],
    "scrollCue": "<i></i> Scroll — or jump straight to <a href=\"#works\" style=\"border-bottom:1px solid currentColor\">the work</a>"
  },
  "philosophy": {
    "labelNum": "01",
    "labelText": "Philosophy",
    "heading": "Design for the <span class=\"it\">decision</span>, not the screen.",
    "lede": "Thirteen years across IBM, BT Group, Siemens and John Deere taught me one thing repeatedly: enterprise software rarely fails on aesthetics. It fails because the person who has to act can't find the thing they need to act on.",
    "tenets": [
      {
        "n": "01",
        "title": "Start from intent, work backwards to interface",
        "body": "Before any wireframe I map what the user is actually trying to settle — the alert they must triage, the dispute they must close, the shift they must hand over. Layout follows from that. It's why <span class=\"hl\">supervisors scan Where → Who before Severity</span>, and why the designs I ship put location first."
      },
      {
        "n": "02",
        "title": "Compress the cycle, never the evidence",
        "body": "I use AI to do the slow parts faster — coding interview transcripts, drafting documentation, generating prototype variants — so the team spends its hours on judgement instead of transcription. <span class=\"hl\">147 field observations, coded and affinity-grouped in a fraction of the usual time</span>, with the audit trail left visible for whoever challenges the number."
      },
      {
        "n": "03",
        "title": "Governance is a set of agreements, not a gate",
        "body": "A design system only holds if the people shipping against it agreed to it. I run <span class=\"hl\">3-in-a-box</span> — PM, engineering and design deciding together — and write the rules down at token level so drift is a diff, not an argument."
      }
    ],
    "kicker": "<span class=\"hl\">Less rework. Higher velocity.</span> <span class=\"mut\">Impact you can put a number on.</span>"
  },
  "experience": {
    "labelNum": "02",
    "labelText": "Experience",
    "heading": "Where I've <span class=\"it\">led</span>.",
    "lede": "Five organisations, one recurring job: arrive where the complexity lives, set the design direction, and leave a team that can hold it without me.",
    "items": [
      {
        "year": "2024 — Present",
        "role": "Product Design Manager",
        "org": "IBM · Power Systems Business Unit",
        "body": "UX strategy for hardware and platform tooling used by <span class=\"hl\">10,000+ enterprise users</span>. Scaled the Carbon Design System across squads, introduced 3-in-a-box governance, and cut UI drift by <span class=\"hl\">20%</span> — first-pass design approvals up <span class=\"hl\">35%</span>.",
        "location": "Bangalore",
        "scope": "10k+ users"
      },
      {
        "year": "2024 — 2025",
        "role": "Product Design Manager",
        "org": "BT Group · Business Billing & Provisioning",
        "body": "Directed UX strategy for global billing and provisioning platforms serving <span class=\"hl\">340,000+ businesses</span> and 500,000 users. Reframed a portal redesign as a system fix, and halved feature-discovery cycles from <span class=\"hl\">4 weeks to 2</span>.",
        "location": "Blr / London",
        "scope": "340k businesses"
      },
      {
        "year": "2022 — 2024",
        "role": "Lead UX Strategist",
        "org": "Siemens AG · Sustainability Intelligence",
        "body": "Set the design vision for sustainability and workforce dashboards used across <span class=\"hl\">190+ countries</span>. Made evidence-based design the default: prototype validation success rose from <span class=\"hl\">60% to 85%</span>.",
        "location": "Blr / Munich",
        "scope": "60 → 85% validation"
      },
      {
        "year": "2022",
        "role": "Lead Creative Director",
        "org": "John Deere · Asia Digital Experience",
        "body": "Digital strategy across immersive XR and virtual showrooms for the Asia market — reducing dependency on physical demos by <span class=\"hl\">40%</span> while keeping the dealer conversation intact.",
        "location": "Pune",
        "scope": "−40% physical demos"
      },
      {
        "year": "2019 — 2022",
        "role": "UX Designer & Researcher",
        "org": "Tata Consultancy Services",
        "body": "Led <span class=\"hl\">30+ MVP engagements</span> for enterprise collaboration platforms, and built the team's first AI-in-the-loop research and prototyping workflows.",
        "location": "Bangalore",
        "scope": "30+ MVPs"
      }
    ]
  },
  "works": {
    "labelNum": "03",
    "labelText": "Works",
    "heading": "Four systems, <span class=\"it\">start to shipped</span>.",
    "lede": "Each case study opens in full — problem, research, the calls I made, and what changed afterwards. All four carry a dark/light switch in the top-right corner, and it remembers your choice across the site.",
    "shelfLabel": "Also on the shelf — models I reuse",
    "frames": [
      {
        "n": "F.01",
        "title": "Intent-First UX <span class=\"it\">(IFU)</span>",
        "body": "An original design language: the interface pre-resolves to the most probable outcome before the user consciously acts. It grew into <b>GRAVITY</b>, a spatial-physics paradigm for enterprise UI."
      },
      {
        "n": "F.02",
        "title": "AI-Augmented Ops",
        "body": "A library of reusable AI skills covering UX strategy, design-system guidance and content strategy — built to compress research and documentation cycles for the teams I lead."
      },
      {
        "n": "F.03",
        "title": "3-in-a-Box Governance",
        "body": "PM, engineering and design deciding together against one written set of agreements. Established at IBM; first-pass design approvals up <b>35%</b>."
      }
    ],
    "footnote": "Founder &amp; Design Lead, <b>DigitalFirstDevotional</b> — a consumer mobile product on Next.js &amp; Supabase, with AI-assisted personalisation end to end.",
    "items": [
      {
        "id": "smart-mining-case-study",
        "title": "Smart Mining Management System",
        "titleItalic": "Management System",
        "href": "smart-mining-case-study.html",
        "meta": "Mining operations platform",
        "year": "UX Lead · Zero-to-one",
        "problem": "Seven spreadsheets, a phone tree and radio stood between a sensor reading and a decision. I led the UX from nothing — no design system, no patterns, no prior research.",
        "outcome": "<b>147 field observations</b> became an alert flow ordered the way\n              supervisors actually think: <b>Where → Who</b>, then severity. Cognitive load per shift\n              down <b>58%</b>.",
        "tags": [
          "Research",
          "Zero-to-one",
          "Intent-First UX"
        ],
        "cta": "Read the case study",
        "badge": "STAR · 12 sections",
        "preview": {
          "type": "svg",
          "svg": "<svg viewBox=\"0 0 480 270\" role=\"img\" aria-hidden=\"true\"> <rect width=\"480\" height=\"270\" fill=\"#070d12\"/> <g stroke=\"#1d3240\" stroke-width=\"1\"> <path d=\"M0 60h480M0 120h480M0 180h480M0 240h480\"/> </g> <g fill=\"none\" stroke-width=\"1.5\" opacity=\".85\"> <circle cx=\"150\" cy=\"135\" r=\"96\" stroke=\"#1d3240\"/> <circle cx=\"150\" cy=\"135\" r=\"70\" stroke=\"#2ee6a6\" stroke-opacity=\".55\"/> <circle cx=\"150\" cy=\"135\" r=\"44\" stroke=\"#36d3e2\" stroke-opacity=\".7\"/> </g> <circle cx=\"150\" cy=\"135\" r=\"21\" fill=\"#2ee6a6\"/> <circle cx=\"150\" cy=\"135\" r=\"21\" fill=\"none\" stroke=\"#0b8a58\" stroke-width=\"6\" stroke-dasharray=\"86 200\" transform=\"rotate(-90 150 135)\"/> <g font-family=\"Helvetica Neue,Arial\" font-size=\"10\" fill=\"#93a7b1\" letter-spacing=\"1.4\"> <text x=\"278\" y=\"86\">WHERE</text><text x=\"278\" y=\"140\">WHO</text><text x=\"278\" y=\"194\">SEVERITY</text> </g> <g> <rect x=\"278\" y=\"94\" width=\"150\" height=\"7\" rx=\"3.5\" fill=\"#122029\"/> <rect x=\"278\" y=\"94\" width=\"132\" height=\"7\" rx=\"3.5\" fill=\"#4d8dff\"/> <rect x=\"278\" y=\"148\" width=\"150\" height=\"7\" rx=\"3.5\" fill=\"#122029\"/> <rect x=\"278\" y=\"148\" width=\"96\" height=\"7\" rx=\"3.5\" fill=\"#36d3e2\"/> <rect x=\"278\" y=\"202\" width=\"150\" height=\"7\" rx=\"3.5\" fill=\"#122029\"/> <rect x=\"278\" y=\"202\" width=\"52\" height=\"7\" rx=\"3.5\" fill=\"#ff4f62\"/> </g> <g fill=\"#2ee6a6\" opacity=\".9\"> <circle cx=\"300\" cy=\"40\" r=\"2.5\"/><circle cx=\"330\" cy=\"40\" r=\"2.5\"/><circle cx=\"360\" cy=\"40\" r=\"2.5\"/><circle cx=\"390\" cy=\"40\" r=\"2.5\"/> </g> </svg>",
          "image": ""
        },
        "openIn": "new-tab"
      },
      {
        "id": "falcon-view-case-study",
        "title": "Falcon View",
        "titleItalic": "View",
        "href": "falcon-view-case-study.html",
        "meta": "Smart hospital management",
        "year": "Design Lead",
        "problem": "Four hospitals ran energy, water, compliance and maintenance on spreadsheets, vendor portals and radio. Nothing arrived in time to act on.",
        "outcome": "One <b>role-aware platform</b> replaced seven systems — eight modules on a\n              shared data model, four different front doors, and a morning decision instead of an\n              afternoon audit.",
        "tags": [
          "Design leadership",
          "Data viz",
          "Sustainability"
        ],
        "cta": "Read the case study",
        "badge": "Role-aware · 8 modules",
        "preview": {
          "type": "svg",
          "svg": "<svg viewBox=\"0 0 480 270\" role=\"img\" aria-hidden=\"true\"> <rect width=\"480\" height=\"270\" fill=\"#070d12\"/> <g stroke=\"#1d3240\"><path d=\"M160 0v270M320 0v270M0 90h480M0 180h480\"/></g> <g font-family=\"Helvetica Neue,Arial\" font-size=\"9\" fill=\"#5f7682\" letter-spacing=\"1.2\"> <text x=\"16\" y=\"26\">ENERGY</text><text x=\"176\" y=\"26\">WATER</text><text x=\"336\" y=\"26\">COMPLIANCE</text> </g> <g fill=\"#36d3e2\"> <rect x=\"16\" y=\"40\" width=\"12\" height=\"34\" rx=\"2\"/><rect x=\"34\" y=\"52\" width=\"12\" height=\"22\" rx=\"2\"/> <rect x=\"52\" y=\"34\" width=\"12\" height=\"40\" rx=\"2\"/><rect x=\"70\" y=\"58\" width=\"12\" height=\"16\" rx=\"2\"/> </g> <path d=\"M176 66l26-18 26 10 26-24 26 16\" fill=\"none\" stroke=\"#2ee6a6\" stroke-width=\"2\"/> <circle cx=\"280\" cy=\"50\" r=\"4\" fill=\"#2ee6a6\"/> <g> <rect x=\"336\" y=\"40\" width=\"128\" height=\"10\" rx=\"5\" fill=\"#122029\"/> <rect x=\"336\" y=\"40\" width=\"92\" height=\"10\" rx=\"5\" fill=\"#4d8dff\"/> <rect x=\"336\" y=\"58\" width=\"128\" height=\"10\" rx=\"5\" fill=\"#122029\"/> <rect x=\"336\" y=\"58\" width=\"46\" height=\"10\" rx=\"5\" fill=\"#ffb84d\"/> </g> <rect x=\"16\" y=\"106\" width=\"448\" height=\"58\" rx=\"10\" fill=\"#0c161d\" stroke=\"#28455a\"/> <text x=\"34\" y=\"132\" font-family=\"Helvetica Neue,Arial\" font-size=\"11\" fill=\"#e9eff1\" letter-spacing=\".4\">ONE LIVE OPERATING PICTURE</text> <text x=\"34\" y=\"150\" font-family=\"Helvetica Neue,Arial\" font-size=\"10\" fill=\"#93a7b1\">7 systems → 1 surface · 4 teams · role-aware front doors</text> <g> <rect x=\"16\" y=\"196\" width=\"104\" height=\"46\" rx=\"8\" fill=\"#122029\" stroke=\"#1d3240\"/> <rect x=\"132\" y=\"196\" width=\"104\" height=\"46\" rx=\"8\" fill=\"#122029\" stroke=\"#1d3240\"/> <rect x=\"248\" y=\"196\" width=\"104\" height=\"46\" rx=\"8\" fill=\"#122029\" stroke=\"#2ee6a6\" stroke-opacity=\".5\"/> <rect x=\"364\" y=\"196\" width=\"100\" height=\"46\" rx=\"8\" fill=\"#122029\" stroke=\"#1d3240\"/> <g fill=\"#5f7682\" font-family=\"Helvetica Neue,Arial\" font-size=\"9\"> <text x=\"30\" y=\"223\">FACILITIES</text><text x=\"146\" y=\"223\">CLINICAL</text> <text x=\"262\" y=\"223\" fill=\"#2ee6a6\">ENERGY</text><text x=\"378\" y=\"223\">COMPLIANCE</text> </g> </g> </svg>",
          "image": ""
        },
        "openIn": "new-tab"
      },
      {
        "id": "incident-management-case-study",
        "title": "Incident Management System",
        "titleItalic": "System",
        "href": "incident-management-case-study.html",
        "meta": "Microsoft Teams · On-call tooling",
        "year": "Lead Product Designer",
        "problem": "On-call teams were losing their most expensive minutes — the first five — hopping between five disconnected tools just to start responding.",
        "outcome": "An <b>On-Call assistant</b> that collapses report, alert and war room into\n              a single Teams conversation: three ways in, one incident object, one place to see\n              everything.",
        "tags": [
          "Service design",
          "Discovery sprint",
          "Teams"
        ],
        "cta": "Read the case study",
        "badge": "Teams-native · End to end",
        "preview": {
          "type": "svg",
          "svg": "<svg viewBox=\"0 0 480 270\" role=\"img\" aria-hidden=\"true\"> <rect width=\"480\" height=\"270\" fill=\"#08080a\"/> <g stroke=\"#26262d\"><path d=\"M0 68h480M0 202h480\"/></g> <text x=\"20\" y=\"40\" font-family=\"Helvetica Neue,Arial\" font-size=\"10\" fill=\"#6f6f78\" letter-spacing=\"1.6\">THE FIRST FIVE MINUTES</text> <g font-family=\"Helvetica Neue,Arial\" font-size=\"9\" fill=\"#a8a8b0\" letter-spacing=\".6\"> <text x=\"20\" y=\"96\">REPORT</text><text x=\"140\" y=\"96\">ALERT</text><text x=\"260\" y=\"96\">TRIAGE</text><text x=\"380\" y=\"96\">WAR ROOM</text> </g> <g stroke=\"#37373f\" stroke-width=\"1.5\" fill=\"none\"><path d=\"M64 92h60M184 92h60M304 92h60\"/></g> <g fill=\"#7d80f0\"><circle cx=\"34\" cy=\"92\" r=\"5\"/><circle cx=\"154\" cy=\"92\" r=\"5\"/><circle cx=\"274\" cy=\"92\" r=\"5\"/><circle cx=\"394\" cy=\"92\" r=\"5\"/></g> <rect x=\"20\" y=\"118\" width=\"440\" height=\"62\" rx=\"12\" fill=\"#0e0e11\" stroke=\"#37373f\"/> <rect x=\"34\" y=\"132\" width=\"34\" height=\"34\" rx=\"9\" fill=\"#1b1b21\" stroke=\"#5b5fc7\"/> <text x=\"80\" y=\"146\" font-family=\"Helvetica Neue,Arial\" font-size=\"11\" fill=\"#f5f5f4\">On-Call assistant · SEV-2 opened</text> <text x=\"80\" y=\"164\" font-family=\"Helvetica Neue,Arial\" font-size=\"10\" fill=\"#a8a8b0\">ticket + team + call, inside one conversation</text> <g fill=\"#3ed492\"><circle cx=\"430\" cy=\"149\" r=\"4\"/></g> <g font-family=\"Helvetica Neue,Arial\" font-size=\"9\" fill=\"#6f6f78\" letter-spacing=\"1\"> <text x=\"20\" y=\"228\">5 TOOLS</text><text x=\"120\" y=\"228\" fill=\"#7d80f0\">→</text><text x=\"150\" y=\"228\">1 SURFACE</text> </g> <g fill=\"#f0584f\" opacity=\".85\"><rect x=\"330\" y=\"218\" width=\"130\" height=\"14\" rx=\"7\" fill=\"#141418\"/> <rect x=\"330\" y=\"218\" width=\"34\" height=\"14\" rx=\"7\" fill=\"#f0584f\"/> <text x=\"374\" y=\"229\" font-size=\"9\" fill=\"#cfcffa\">−68% time to respond</text></g> </svg>",
          "image": ""
        },
        "openIn": "new-tab"
      },
      {
        "id": "bt-billing-case-study",
        "title": "From the Notebook",
        "titleItalic": "Notebook",
        "href": "bt-billing-case-study.html",
        "meta": "BT Group · Business billing",
        "year": "UX Strategy",
        "problem": "How do you redesign a billing portal that 340,000 businesses can't escape — when the portal isn't the thing that's broken?",
        "outcome": "The scribbles, sticky walls and 2am margin notes: <b>120,000 reviews\n              coded</b>, 23 diagrams, 30+ concepts, 25 killed — and the evidence trail left in full\n              view for the sceptical reader.",
        "tags": [
          "Process",
          "Evidence trail",
          "Sketchbook"
        ],
        "cta": "Read the case study",
        "badge": "The notebook · Unpolished",
        "preview": {
          "type": "svg",
          "svg": "<svg viewBox=\"0 0 480 270\" role=\"img\" aria-hidden=\"true\"> <rect width=\"480\" height=\"270\" fill=\"#16140f\"/> <g stroke=\"rgba(236,227,207,.07)\"><path d=\"M0 32h480M0 64h480M0 96h480M0 128h480M0 160h480M0 192h480M0 224h480M0 256h480\"/></g> <g transform=\"rotate(-2.4 130 96)\"> <rect x=\"34\" y=\"40\" width=\"196\" height=\"132\" rx=\"3\" fill=\"#f4eede\"/> <rect x=\"86\" y=\"28\" width=\"76\" height=\"22\" rx=\"2\" fill=\"rgba(220,215,180,.75)\" transform=\"rotate(-3 124 39)\"/> <g stroke=\"#c4b89e\" stroke-width=\"1.4\"><path d=\"M52 76h160M52 96h160M52 116h120\"/></g> <path d=\"M52 146c26-16 52 8 78-6s48 6 62-4\" fill=\"none\" stroke=\"#c8341d\" stroke-width=\"2\"/> </g> <g transform=\"rotate(3 350 110)\"> <rect x=\"272\" y=\"52\" width=\"150\" height=\"112\" rx=\"2\" fill=\"#fde88a\"/> <g stroke=\"rgba(26,20,16,.5)\" stroke-width=\"1.6\"><path d=\"M288 84h118M288 104h118M288 124h82\"/></g> <text x=\"288\" y=\"152\" font-family=\"Helvetica Neue,Arial\" font-size=\"10\" fill=\"#b23a23\" letter-spacing=\".4\">30+ concepts</text> </g> <g transform=\"rotate(-1.2 190 216)\"> <rect x=\"60\" y=\"188\" width=\"260\" height=\"58\" rx=\"2\" fill=\"#f3ecda\"/> <text x=\"76\" y=\"212\" font-family=\"Helvetica Neue,Arial\" font-size=\"11\" fill=\"#1a1410\">25 killed · 5 survived</text> <path d=\"M76 228h228\" stroke=\"#c4b89e\" stroke-width=\"1.2\"/> </g> <g transform=\"rotate(4 400 216)\"> <rect x=\"344\" y=\"186\" width=\"112\" height=\"60\" rx=\"2\" fill=\"#a8d4f0\"/> <g stroke=\"rgba(26,20,16,.45)\" stroke-width=\"1.5\"><path d=\"M358 208h84M358 224h60\"/></g> </g> <path d=\"M236 100c18-22 46-6 62-26\" fill=\"none\" stroke=\"#ff6f52\" stroke-width=\"1.6\" stroke-dasharray=\"4 4\"/> </svg>",
          "image": ""
        },
        "openIn": "new-tab"
      }
    ]
  },
  "ai": {
    "labelNum": "04",
    "labelText": "AI Practices",
    "heading": "How I put AI to <span class=\"it\">work</span>.",
    "lede": "<span class=\"todo\">One or two sentences on what AI-augmented practice means on your teams — the outcome you're buying, not the tools you use.</span>",
    "pipelineLabel": "The augmented pipeline",
    "pipeline": [
      {
        "n": "S.01",
        "title": "Stage name",
        "ai": "what the model does here",
        "human": "what stays human"
      },
      {
        "n": "S.02",
        "title": "Stage name",
        "ai": "what the model does here",
        "human": "what stays human"
      },
      {
        "n": "S.03",
        "title": "Stage name",
        "ai": "what the model does here",
        "human": "what stays human"
      },
      {
        "n": "S.04",
        "title": "Stage name",
        "ai": "what the model does here",
        "human": "what stays human"
      },
      {
        "n": "S.05",
        "title": "Stage name",
        "ai": "what the model does here",
        "human": "what stays human"
      }
    ],
    "pipelineKey": [
      "<b>AI</b> — delegated",
      "<b>YOU</b> — judgement, always",
      "optional third key"
    ],
    "practicesLabel": "Practices & proof points",
    "practices": [
      {
        "n": "P.01",
        "title": "Practice name",
        "what": "what you actually do, in one line",
        "withWhat": "tooling, models, or the skill you wrote",
        "proof": "<span class=\"todo\">The number it moved — before → after</span>"
      },
      {
        "n": "P.02",
        "title": "Practice name",
        "what": "what you actually do, in one line",
        "withWhat": "tooling, models, or the skill you wrote",
        "proof": "<span class=\"todo\">The number it moved — before → after</span>"
      },
      {
        "n": "P.03",
        "title": "Practice name",
        "what": "what you actually do, in one line",
        "withWhat": "tooling, models, or the skill you wrote",
        "proof": "<span class=\"todo\">The number it moved — before → after</span>"
      },
      {
        "n": "P.04",
        "title": "Practice name",
        "what": "what you actually do, in one line",
        "withWhat": "tooling, models, or the skill you wrote",
        "proof": "<span class=\"todo\">The number it moved — before → after</span>"
      },
      {
        "n": "P.05",
        "title": "Practice name",
        "what": "what you actually do, in one line",
        "withWhat": "tooling, models, or the skill you wrote",
        "proof": "<span class=\"todo\">The number it moved — before → after</span>"
      },
      {
        "n": "P.06",
        "title": "Practice name",
        "what": "what you actually do, in one line",
        "withWhat": "tooling, models, or the skill you wrote",
        "proof": "<span class=\"todo\">The number it moved — before → after</span>"
      }
    ],
    "guardHeading": "Where I <span class=\"it\">don't</span> use AI.",
    "guardrails": [
      "<span class=\"todo\">The first guardrail — the call you never delegate, and why it matters to a hiring manager reading this.</span>",
      "<span class=\"todo\">The second guardrail — e.g. evidence, consent, or attribution.</span>",
      "<span class=\"todo\">The third guardrail — e.g. what a model may never ship unreviewed.</span>"
    ],
    "fillIn": "<b>Fill me in.</b> Everything highlighted in amber is a placeholder — search this file for <b>class=\"todo\"</b> to find all of them, then delete this paragraph."
  },
  "contact": {
    "heading": "Let's build the <span class=\"it\">future</span>.",
    "email": "ar.anupamsarkar@gmail.com",
    "emailHref": "mailto:ar.anupamsarkar@gmail.com",
    "sub": "Open to design leadership, UX strategy and AI-augmented practice work — Bangalore, or remote across UK / EU time zones.",
    "copyright": "© <span id=\"yr\">2026</span> Anupam Sarkar",
    "credential": "IIT Hyderabad Gold Medalist · M.Des",
    "links": [
      {
        "label": "LinkedIn",
        "href": "https://www.linkedin.com/",
        "newTab": true
      },
      {
        "label": "Email",
        "href": "mailto:ar.anupamsarkar@gmail.com",
        "newTab": false
      },
      {
        "label": "Back to top ↑",
        "href": "#top",
        "newTab": false
      }
    ]
  }
};

const DESIGN_TOKENS = {
  "light": {
    "bg": "#FAFAFA",
    "text": "#0A0A0A",
    "text_muted": "#666666",
    "text_faint": "#8C8C8C",
    "border": "#E5E5E5",
    "border_strong": "#0A0A0A",
    "hover_bg": "#F2F2F2",
    "card": "#FFFFFF",
    "header_bg": "rgba(250,250,250,.82)",
    "shadow": "0 18px 44px rgba(10,10,10,.09)",
    "preview_bg": "#0B1218",
    "preview_ink": "#E9EFF1",
    "preview_line": "rgba(233,239,241,.16)",
    "font_main": "\"Helvetica Neue\",Helvetica,Arial,sans-serif",
    "font_mono": "ui-monospace,\"SF Mono\",SFMono-Regular,Menlo,Consolas,monospace",
    "ease": "cubic-bezier(.2,0,0,1)",
    "t": ".34s var(--ease)"
  },
  "dark": {
    "bg": "#0A0A0A",
    "text": "#FAFAFA",
    "text_muted": "#9A9A9A",
    "text_faint": "#6E6E6E",
    "border": "#222222",
    "border_strong": "#FAFAFA",
    "hover_bg": "#131313",
    "card": "#101010",
    "header_bg": "rgba(10,10,10,.82)",
    "shadow": "0 18px 44px rgba(0,0,0,.55)",
    "preview_bg": "#F5F0E3",
    "preview_ink": "#1A1410",
    "preview_line": "rgba(26,20,16,.16)"
  }
};

const CASE_STUDIES = {
  "smart-mining": {
    "file": "smart-mining-case-study.html",
    "tokenPrefix": "mining",
    "tokenCount": 34,
    "dark": {
      "page ground": "#070d12",
      "section surface": "#0c161d",
      "raised": "#122029",
      "hairline": "#1d3240",
      "primary text": "#e9eff1",
      "secondary text": "#93a7b1",
      "green": "#2ee6a6",
      "cyan": "#36d3e2",
      "blue": "#4d8dff",
      "violet": "#8b7bff",
      "critical": "#ff4f62",
      "ok": "#4dd69c"
    },
    "light": {
      "page": "#f4f7f8",
      "surface": "#ffffff",
      "raised": "#eaf0f3",
      "line": "#dbe4e9",
      "ink": "#0e1a21",
      "ink 2": "#5b7180",
      "green": "#0b7a51",
      "cyan": "#0b7f92",
      "blue": "#1d5fd6",
      "violet": "#6746e0",
      "critical": "#d9263d",
      "ok": "#0e7a52"
    },
    "tokenByRole": {
      "page": "--mining-c03",
      "surface": "--mining-c04",
      "raised": "--mining-c05",
      "line": "--mining-c06",
      "ink": "--mining-c07",
      "ink 2": "--mining-c08",
      "green": "--mining-c10",
      "cyan": "--mining-c11",
      "blue": "--mining-c09",
      "violet": "--mining-c34",
      "critical": "--mining-c13",
      "ok": "--mining-c14"
    }
  },
  "falcon-view": {
    "file": "falcon-view-case-study.html",
    "tokenPrefix": "falcon",
    "tokenCount": 32,
    "dark": {
      "page ground": "#070d12",
      "section surface": "#0c161d",
      "raised": "#122029",
      "hairline": "#1d3240",
      "primary text": "#e9eff1",
      "secondary text": "#93a7b1",
      "green": "#2ee6a6",
      "cyan": "#36d3e2",
      "blue": "#4d8dff",
      "warning": "#ffb84d",
      "critical": "#ff4f62",
      "dim": "#5f7682"
    },
    "light": {
      "page": "#f4f7f8",
      "surface": "#ffffff",
      "raised": "#eaf0f3",
      "line": "#dbe4e9",
      "ink": "#0e1a21",
      "ink 2": "#5b7180",
      "green": "#0b7a51",
      "cyan": "#0b7f92",
      "blue": "#1d5fd6",
      "warning": "#96600a",
      "critical": "#d9263d",
      "dim": "#8b9aa3"
    },
    "tokenByRole": {
      "page": "--falcon-c03",
      "surface": "--falcon-c04",
      "raised": "--falcon-c05",
      "line": "--falcon-c06",
      "ink": "--falcon-c08",
      "ink 2": "--falcon-c09",
      "green": "--falcon-c12",
      "cyan": "--falcon-c13",
      "blue": "--falcon-c11",
      "warning": "--falcon-c16",
      "critical": "--falcon-c15",
      "dim": "--falcon-c10"
    }
  },
  "incident-management": {
    "file": "incident-management-case-study.html",
    "tokenPrefix": "incident",
    "tokenCount": 20,
    "dark": {
      "page ground": "#08080a",
      "section surface": "#0e0e11",
      "raised": "#141418",
      "hairline": "#26262d",
      "primary text": "#f5f5f4",
      "secondary text": "#a8a8b0",
      "accent": "#7d80f0",
      "cyan": "#54c8e8",
      "red": "#f0584f",
      "green": "#3ed492",
      "amber": "#f2a93a",
      "strong line": "#37373f"
    },
    "light": {
      "page": "#f7f7f9",
      "surface": "#f1f1f4",
      "raised": "#ffffff",
      "line": "#dcdce3",
      "ink": "#101014",
      "ink 2": "#4c4c57",
      "accent": "#4b4fe0",
      "cyan": "#0b7f9e",
      "red": "#c8332a",
      "green": "#0e7a52",
      "amber": "#8a5b06",
      "strong line": "#c9c9d3"
    },
    "tokenByRole": {
      "page": "--incident-c01",
      "surface": "--incident-c02",
      "raised": "--incident-c03",
      "line": "--incident-c05",
      "ink": "--incident-c07",
      "ink 2": "--incident-c08",
      "accent": "--incident-c11",
      "cyan": "--incident-c13",
      "red": "--incident-c14",
      "green": "--incident-c16",
      "amber": "--incident-c15",
      "strong line": "--incident-c06"
    }
  },
  "bt-billing": {
    "file": "bt-billing-case-study.html",
    "tokenPrefix": null,
    "tokenCount": 0,
    "dark": {
      "page": "#16140f",
      "surface": "#1d1a14",
      "raised": "#f4eede",
      "line": "#3a352a",
      "ink": "#ece3cf",
      "ink 2": "#cabfa6",
      "ink 3": "#9c917a",
      "red pen": "#ff6f52",
      "blue pen": "#79b4f0",
      "sticky": "#fde88a"
    },
    "light": {
      "page": "#f5f0e3",
      "surface": "#ede7d4",
      "raised": "#fffdf6",
      "line": "#c4b89e",
      "ink": "#1a1410",
      "ink 2": "#3d342a",
      "ink 3": "#6b5d4d",
      "red pen": "#c8341d",
      "blue pen": "#1f4c8f",
      "sticky": "#ffe066"
    },
    "tokenByRole": {},
    "note": "BT was authored light and had a dark studio layer painted over it, so its light mode re-asserts the paper palette rather than remapping tokens."
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  SCHEMA — drives every form in admin.html. One description of the content
//  model, so adding a field here adds it to the admin, the validation and the
//  export at the same time.
//
//  field types: text | rich | textarea | url | email | color | number | select
//  rich = inline HTML allowed; the admin gives it a mini formatting toolbar
//       (Bold, Italic, Highlight, Muted) that emits the site's own classes.
// ══════════════════════════════════════════════════════════════════════════
const SCHEMA = {
  meta: {
    label: 'SEO & document', icon: 'doc',
    fields: [
      { k: 'title', label: 'Browser title', type: 'text', max: 70,
        hint: 'Shown in the tab and in search results. Aim for 50–60 characters.' },
      { k: 'description', label: 'Meta description', type: 'textarea', max: 170,
        hint: 'The snippet under your name in search results. 140–160 characters.' },
      { k: 'lang', label: 'Language code', type: 'text', hint: 'BCP-47, e.g. en or en-GB.' },
    ],
  },

  header: {
    label: 'Header & navigation', icon: 'nav',
    fields: [
      { k: 'logoName', label: 'Logo — name', type: 'text' },
      { k: 'logoRole', label: 'Logo — role line', type: 'text',
        hint: 'The muted text after your name. Leave empty to drop it.' },
      { k: 'themeLabelDark', label: 'Theme button label (light mode)', type: 'text',
        hint: 'What the toggle reads while the page is light. It flips automatically in dark.' },
    ],
    arrays: [
      { k: 'nav', label: 'Desktop navigation', singular: 'link', max: 6,
        itemLabel: (it) => it.label || 'Untitled link',
        fields: [
          { k: 'label', label: 'Label', type: 'text' },
          { k: 'href', label: 'Target', type: 'text',
            hint: 'An anchor like #works, or any URL.' },
        ] },
      { k: 'navMobile', label: 'Mobile menu', singular: 'item', max: 6,
        itemLabel: (it) => it.label || 'Untitled item',
        fields: [
          { k: 'label', label: 'Label', type: 'text' },
          { k: 'sub', label: 'Subtitle', type: 'text', hint: 'The small line under the label.' },
          { k: 'href', label: 'Target', type: 'text' },
        ] },
    ],
  },

  hero: {
    label: 'Hero', icon: 'hero',
    fields: [
      { k: 'eyebrowLeft', label: 'Eyebrow — left', type: 'text' },
      { k: 'eyebrowRight', label: 'Eyebrow — right', type: 'text' },
      { k: 'h1First', label: 'Name — line 1', type: 'text', hint: 'The huge lockup breaks between the two lines.' },
      { k: 'h1Last', label: 'Name — line 2', type: 'text',
        hint: 'The styled period after this is fixed, so leave it out of the text.' },
      { k: 'statement', label: 'Statement', type: 'rich',
        hint: 'Highlight the phrase you want a reader to keep. Two highlights is plenty.' },
      { k: 'scrollCue', label: 'Scroll cue', type: 'rich' },
    ],
    arrays: [
      { k: 'stats', label: 'Stats', singular: 'stat', max: 4,
        itemLabel: (it) => it.value || 'Empty stat',
        fields: [
          { k: 'value', label: 'Figure', type: 'text', hint: 'Short: 13+, 340k, 4.' },
          { k: 'label', label: 'Caption', type: 'text' },
        ] },
    ],
  },

  philosophy: {
    label: '01 · Philosophy', icon: '01',
    fields: [
      { k: 'labelNum', label: 'Section number', type: 'text', hint: 'The bold figure in the gutter: 01.' },
      { k: 'labelText', label: 'Section name', type: 'text', hint: 'Philosophy.' },
      { k: 'heading', label: 'Heading', type: 'rich' },
      { k: 'lede', label: 'Standfirst', type: 'rich' },
      { k: 'kicker', label: 'Closing line', type: 'rich' },
    ],
    arrays: [
      { k: 'tenets', label: 'Tenets', singular: 'tenet', max: 6,
        itemLabel: (it) => it.title || 'Untitled tenet',
        fields: [
          { k: 'n', label: 'Number', type: 'text', hint: 'Shown in the gutter: 01, 02…' },
          { k: 'title', label: 'Title', type: 'text' },
          { k: 'body', label: 'Body', type: 'rich' },
        ] },
    ],
  },

  experience: {
    label: '02 · Experience', icon: '02',
    fields: [
      { k: 'labelNum', label: 'Section number', type: 'text' },
      { k: 'labelText', label: 'Section name', type: 'text' },
      { k: 'heading', label: 'Heading', type: 'rich' },
      { k: 'lede', label: 'Standfirst', type: 'rich' },
    ],
    arrays: [
      { k: 'items', label: 'Roles', singular: 'role', max: 12,
        itemLabel: (it) => [it.year, it.role].filter(Boolean).join(' · ') || 'Untitled role',
        fields: [
          { k: 'year', label: 'Years', type: 'text', hint: 'e.g. 2024 — Present' },
          { k: 'role', label: 'Role', type: 'text' },
          { k: 'org', label: 'Organisation & unit', type: 'text' },
          { k: 'body', label: 'What you did', type: 'rich',
            hint: 'Highlight the number. One or two sentences beats a paragraph.' },
          { k: 'location', label: 'Location', type: 'text' },
          { k: 'scope', label: 'Scope chip', type: 'text', hint: 'The mono line under the location.' },
        ] },
    ],
  },

  works: {
    label: '03 · Works', icon: '03',
    fields: [
      { k: 'labelNum', label: 'Section number', type: 'text' },
      { k: 'labelText', label: 'Section name', type: 'text' },
      { k: 'heading', label: 'Heading', type: 'rich' },
      { k: 'lede', label: 'Standfirst', type: 'rich' },
      { k: 'shelfLabel', label: 'Models shelf — eyebrow', type: 'text' },
      { k: 'footnote', label: 'Models shelf — footnote', type: 'rich' },
    ],
    arrays: [
      { k: 'frames', label: 'Reusable models', singular: 'model', max: 6,
        itemLabel: (it) => (it.title || '').replace(/<[^>]+>/g, '') || 'Untitled model',
        fields: [
          { k: 'n', label: 'Number', type: 'text', hint: 'F.01, F.02…' },
          { k: 'title', label: 'Title', type: 'rich' },
          { k: 'body', label: 'Body', type: 'rich' },
        ] },
    ],
    // project cards live in their own panel because they carry a preview asset
    projectsPanel: true,
  },

  projects: {
    label: 'Project cards', icon: 'cards', panel: 'works',
    arrays: [
      { k: 'items', label: 'Case studies', singular: 'project', max: 8, source: 'works.items',
        itemLabel: (it) => (it.title || '').replace(/<[^>]+>/g, '') || 'Untitled project',
        fields: [
          { k: 'title', label: 'Title', type: 'text' },
          { k: 'titleItalic', label: 'Title — italic part', type: 'text',
            hint: 'Rendered in the muted italic that finishes each title.' },
          { k: 'href', label: 'Case-study file', type: 'text',
            hint: 'Relative filename, e.g. bt-billing-case-study.html' },
          { k: 'meta', label: 'Meta — left', type: 'text', hint: 'Sector or product type.' },
          { k: 'year', label: 'Meta — right', type: 'text', hint: 'Your role or the year.' },
          { k: 'problem', label: 'The problem', type: 'textarea' },
          { k: 'outcome', label: 'The outcome', type: 'rich',
            hint: 'Bold the number: <b>58%</b> is the house style here.' },
          { k: 'cta', label: 'Call to action', type: 'text' },
          { k: 'badge', label: 'Preview badge', type: 'text' },
          { k: 'openIn', label: 'Opens in', type: 'select',
            options: [['new-tab', 'A new tab'], ['same-tab', 'The same tab']] },
        ] },
    ],
  },

  ai: {
    label: '04 · AI Practices', icon: '04',
    fields: [
      { k: 'labelNum', label: 'Section number', type: 'text' },
      { k: 'labelText', label: 'Section name', type: 'text' },
      { k: 'heading', label: 'Heading', type: 'rich' },
      { k: 'lede', label: 'Standfirst', type: 'rich' },
      { k: 'pipelineLabel', label: 'Pipeline — eyebrow', type: 'text' },
      { k: 'practicesLabel', label: 'Practices — eyebrow', type: 'text' },
      { k: 'guardHeading', label: 'Guardrails — heading', type: 'rich' },
      { k: 'fillIn', label: 'Placeholder reminder', type: 'rich',
        hint: 'Delete this once every amber placeholder is filled — it only exists to stop the page shipping half-written.' },
    ],
    arrays: [
      { k: 'pipeline', label: 'Pipeline stages', singular: 'stage', max: 8,
        itemLabel: (it) => it.title || 'Untitled stage',
        fields: [
          { k: 'n', label: 'Number', type: 'text', hint: 'S.01, S.02…' },
          { k: 'title', label: 'Stage', type: 'text', hint: 'Research, Synthesis, Ideation…' },
          { k: 'ai', label: 'AI does', type: 'rich' },
          { k: 'human', label: 'You keep', type: 'rich' },
        ] },
      { k: 'pipelineKey', label: 'Pipeline key', singular: 'key item', max: 3,
        itemLabel: (it, i) => 'Key ' + (i + 1),
        fields: [{ k: '$self', label: 'Text', type: 'rich' }] },
      { k: 'practices', label: 'Practices', singular: 'practice', max: 9,
        itemLabel: (it) => it.title || 'Untitled practice',
        fields: [
          { k: 'n', label: 'Number', type: 'text', hint: 'P.01, P.02…' },
          { k: 'title', label: 'Name', type: 'text' },
          { k: 'what', label: 'Do — what you do', type: 'rich' },
          { k: 'withWhat', label: 'With — tooling', type: 'rich' },
          { k: 'proof', label: 'Proof point', type: 'rich', hint: 'The number it moved.' },
        ] },
      { k: 'guardrails', label: 'Guardrails', singular: 'guardrail', max: 6,
        itemLabel: (it, i) => (it || '').replace(/<[^>]+>/g, '').slice(0, 42) || 'Guardrail ' + (i + 1),
        fields: [{ k: '$self', label: 'Text', type: 'rich' }] },
    ],
  },

  contact: {
    label: 'Contact & footer', icon: 'mail',
    fields: [
      { k: 'heading', label: 'Heading', type: 'rich' },
      { k: 'email', label: 'Email address', type: 'email' },
      { k: 'emailHref', label: 'Email link', type: 'text',
        hint: 'Usually mailto: followed by the same address.' },
      { k: 'sub', label: 'Availability line', type: 'rich' },
      { k: 'copyright', label: 'Copyright', type: 'rich',
        hint: 'The year is replaced with the current year automatically at runtime.' },
      { k: 'credential', label: 'Credential', type: 'text' },
    ],
    arrays: [
      { k: 'links', label: 'Footer links', singular: 'link', max: 5,
        itemLabel: (it) => it.label || 'Untitled link',
        fields: [
          { k: 'label', label: 'Label', type: 'text' },
          { k: 'href', label: 'URL', type: 'url' },
          { k: 'newTab', label: 'Open in a new tab', type: 'select',
            options: [[true, 'Yes'], [false, 'No']] },
        ] },
    ],
  },
};

/* Paths edited by bespoke UI rather than a generated form field:
     works.items.[].tags           -> the chip editor on the Project cards panel
     works.items.[].preview.*      -> the Media panel (SVG source / image upload)
     works.items.[].id             -> internal, assigned when a card is created
   Declared here so build/coverage.js can prove every leaf of the model is
   reachable from the admin, including the ones with no schema field. */
const EXTRA_EDITABLE = [
  'works.items.[].tags.[]',
  'works.items.[].preview.type',
  'works.items.[].preview.svg',
  'works.items.[].preview.image',
  'works.items.[].id',
];

// which design tokens get a colour picker vs a text field
const TOKEN_GROUPS = [
  { label: 'Surfaces & ink', keys: ['bg', 'card', 'text', 'text_muted', 'text_faint',
                                    'border', 'border_strong', 'hover_bg', 'header_bg', 'shadow'] },
  { label: 'Typography', keys: ['font_main', 'font_mono'] },
  { label: 'Motion & shape', keys: ['ease', 't'] },
  { label: 'Card previews', keys: ['preview_bg', 'preview_ink', 'preview_line'] },
];


const CASE_LIGHT_FULL = {
  "smart-mining": {
    "#faf9f5": "#f7f9fa",
    "#141413": "#0d171d",
    "#070d12": "#f4f7f8",
    "#0c161d": "#ffffff",
    "#122029": "#eaf0f3",
    "#1d3240": "#dbe4e9",
    "#e9eff1": "#0e1a21",
    "#93a7b1": "#5b7180",
    "#4d8dff": "#1d5fd6",
    "#2ee6a6": "#0b7a51",
    "#36d3e2": "#0b7f92",
    "#5a7cff": "#3b4fd8",
    "#ff4f62": "#d9263d",
    "#4dd69c": "#0e7a52",
    "#38c6f0": "#0e7fa8",
    "#ff8fa0": "#c4374a",
    "#4a5d69": "#b9c7ce",
    "#000000": "#5d6f79",
    "#9db3ff": "#2f55c4",
    "#3a4d59": "#cbd6dc",
    "#5d7280": "#6f828d",
    "#5a6b75": "#77868f",
    "#7fb2ff": "#5b86e8",
    "#2a0f15": "#fdeef1",
    "#062018": "#f2fbf7",
    "#ffffff": "#ffffff",
    "#b3c3cb": "#3d525e",
    "#0a1218": "#eef3f5",
    "#ffc2cc": "#a52b3d",
    "#c9d6dc": "#2c3f49",
    "#c6d3d9": "#33474f",
    "#dfe8ec": "#1b2b33",
    "#c93a4b": "#b81f31",
    "#8b7bff": "#6746e0"
  },
  "falcon-view": {
    "#faf9f5": "#f7f9fa",
    "#141413": "#0d171d",
    "#070d12": "#f4f7f8",
    "#0c161d": "#ffffff",
    "#122029": "#eaf0f3",
    "#1d3240": "#dbe4e9",
    "#28455a": "#c3d2da",
    "#e9eff1": "#0e1a21",
    "#93a7b1": "#5b7180",
    "#5f7682": "#8b9aa3",
    "#4d8dff": "#1d5fd6",
    "#2ee6a6": "#0b7a51",
    "#36d3e2": "#0b7f92",
    "#5a7cff": "#3b4fd8",
    "#ff4f62": "#d9263d",
    "#ffb84d": "#96600a",
    "#4dd69c": "#0e7a52",
    "#38c6f0": "#0e7fa8",
    "#ffffff": "#ffffff",
    "#09131a": "#eef4f6",
    "#04131a": "#eaf2f5",
    "#0f1d26": "#e4edf1",
    "#000000": "#94a3ac",
    "#10302a": "#e0f2ea",
    "#0f2e36": "#dff0f2",
    "#0a141b": "#e9f0f3",
    "#f3c3c8": "#b32437",
    "#081117": "#f2f6f8",
    "#17303c": "#dde9ee",
    "#123a46": "#d7e9ee",
    "#060b0f": "#f6f8f9",
    "#152542": "#e3e9f7"
  },
  "incident-management": {
    "#08080a": "#f7f7f9",
    "#0e0e11": "#f1f1f4",
    "#141418": "#ffffff",
    "#1b1b21": "#ececf1",
    "#26262d": "#dcdce3",
    "#37373f": "#c9c9d3",
    "#f5f5f4": "#101014",
    "#a8a8b0": "#4c4c57",
    "#6f6f78": "#7a7a85",
    "#4a4a52": "#b3b3bf",
    "#7d80f0": "#4b4fe0",
    "#5b5fc7": "#3c40b4",
    "#54c8e8": "#0b7f9e",
    "#f0584f": "#c8332a",
    "#f2a93a": "#8a5b06",
    "#3ed492": "#0e7a52",
    "#111111": "#16161c",
    "#ffffff": "#ffffff",
    "#a9adff": "#3a3fb8",
    "#cfcffa": "#2c31a8"
  }
};


/* const does not create window properties, so publish them explicitly.
   Guarded so this file can also be require()d by the Node build and test scripts. */
if (typeof window !== 'undefined') {
  window.SITE_CONTENT = SITE_CONTENT;
  window.DESIGN_TOKENS = DESIGN_TOKENS;
  window.CASE_STUDIES = CASE_STUDIES;
  window.CASE_LIGHT_FULL = CASE_LIGHT_FULL;
  window.SCHEMA = SCHEMA;
  window.TOKEN_GROUPS = TOKEN_GROUPS;
  window.EXTRA_EDITABLE = EXTRA_EDITABLE;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SITE_CONTENT, DESIGN_TOKENS, CASE_STUDIES, CASE_LIGHT_FULL,
                     SCHEMA, TOKEN_GROUPS, EXTRA_EDITABLE };
}
