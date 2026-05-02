import React, { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { GoogleGenerativeAI } from '@google/generative-ai'

/** Curated official resources (ECI / NVSP). URLs verified reachable May 2026. */
const OFFICIAL_STEP_RESOURCES = [
  {
    href: 'https://voters.eci.gov.in/',
    anchor: 'National Voters’ Services Portal (NVSP)',
    hint:
      'Start here for a new Voter ID: apply online (Form 6), track application status, request corrections (Form 8), and download e-EPIC — all on ECI’s NVSP.'
  },
  {
    href: 'https://www.eci.gov.in/officers-directory/chief-electoral-officers',
    anchor: 'Chief Electoral Officers directory',
    hint:
      'Find your state Chief Electoral Officer (CEO) — the official channel for state roll revision dates, booth-related FAQs, and links to your state’s voter helpline portals.'
  },
  {
    href: 'https://affidavit.eci.gov.in/',
    anchor: 'ECI candidate affidavits',
    hint:
      'Compare candidates using mandatory affidavits (assets, criminal cases, education) filed with nominations — a neutral, official source before you vote.'
  }
]

const UNDER_18_QUIPS = [
  'Wait till 18, young blood — the line starts there, not here.',
  'Almost. Clock a few more birthdays; the ballot will still be fashionably late.',
  'Patience, rookie voter: democracy is 18+ only. Till then, read the room (and the manifestos).',
  'Seventeen and fired up? Save the spark — polling day wants your ID, not just your vibes.',
  'Hold the horses, future elector — ECI says 18 first, stickers second.'
]

export default function VoterRoadmap() {
  const [age, setAge] = useState('')
  const [stateVal, setStateVal] = useState('')
  const [interests, setInterests] = useState([])
  const [roadmap, setRoadmap] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const timelineRef = useRef(null)

  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
  const MODEL_ID = 'gemini-2.5-flash-lite'

  const STATES = useMemo(
    () => [
      'Andhra Pradesh',
      'Assam',
      'Bihar',
      'Chhattisgarh',
      'Delhi (NCT)',
      'Goa',
      'Gujarat',
      'Haryana',
      'Himachal Pradesh',
      'Jammu & Kashmir',
      'Jharkhand',
      'Karnataka',
      'Kerala',
      'Madhya Pradesh',
      'Maharashtra',
      'Odisha',
      'Punjab',
      'Rajasthan',
      'Tamil Nadu',
      'Telangana',
      'Uttar Pradesh',
      'Uttarakhand',
      'West Bengal'
    ],
    []
  )

  const INTEREST_OPTIONS = useMemo(
    () => ['Tech', 'Climate', 'Education', 'Economy', 'Healthcare'],
    []
  )

  const ageParsed = useMemo(() => {
    if (age === '') return null
    const n = Number(age)
    return Number.isFinite(n) ? n : null
  }, [age])

  const isUnder18 = ageParsed !== null && ageParsed > 0 && ageParsed < 18

  const under18Quip = useMemo(() => {
    if (!isUnder18 || ageParsed === null) return ''
    return UNDER_18_QUIPS[ageParsed % UNDER_18_QUIPS.length]
  }, [isUnder18, ageParsed])

  const canSubmit = useMemo(() => {
    return (
      ageParsed !== null &&
      ageParsed >= 18 &&
      stateVal &&
      interests.length > 0 &&
      !isLoading &&
      Boolean(API_KEY)
    )
  }, [ageParsed, stateVal, interests.length, isLoading, API_KEY])

  function toggleInterest(label) {
    setInterests(prev => (prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label]))
  }

  function reset() {
    setAge('')
    setStateVal('')
    setInterests([])
    setRoadmap(null)
    setError('')
    setIsLoading(false)
  }

  async function handleGenerate(e) {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    setRoadmap(null)

    if (!API_KEY) {
      setIsLoading(false)
      setError('Missing key. Add VITE_GEMINI_API_KEY to your .env and restart the dev server.')
      return
    }

    if (ageParsed === null || ageParsed <= 0) {
      setIsLoading(false)
      setError('Invalid age. Enter a real number.')
      return
    }

    if (ageParsed < 18) {
      setIsLoading(false)
      return
    }

    const internalPrompt = `User Profile: ${ageParsed} years old, living in ${stateVal}, interested in ${interests.join(', ')}.

As a neutral ECI-focused advisor, generate a 3-step action plan for voting in India in the 2026–2027 election cycle.

CRITICAL — Step 1 (MAIN POINT): The entire first step must centre on getting and securing a Voter ID (EPIC): eligibility at their age, applying or correcting enrolment via the National Voters' Services Portal (Form 6 for new voters, Form 8 for corrections where relevant), tracking application status, and downloading e-EPIC when issued. Do not make step 1 about anything else until that is covered.

Step 2: State-specific logistics for ${stateVal} — polling preparation using official state CEO / voter-helpline information (no unofficial sites).

Step 3: Connect their interests (${interests.join(', ')}) to neutral policy research for voters (manifesto comparison, candidate affidavits on record, credible official sources only — do not invent URLs).

Style: Each "description" must be SHORT (2–4 tight sentences), practical, and accurate. No party endorsement. No fake links in JSON (the app will attach official links separately).

Return ONLY a JSON object:
{
  "roadmap": [
    { "step_title": "string", "description": "string", "deadline": "string (e.g. a month/year or concrete cut-off wording)" }
  ]
}
Exactly 3 objects in "roadmap", in order: Step 1 = Voter ID / EPIC, Step 2 = state logistics, Step 3 = interest-based research.`

    try {
      const genAI = new GoogleGenerativeAI(API_KEY)
      const model = genAI.getGenerativeModel({
        model: MODEL_ID,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.6
        }
      })

      const result = await model.generateContent(internalPrompt)
      const raw = result?.response?.text?.() ?? ''

      let parsed
      try {
        parsed = JSON.parse(raw)
      } catch (e2) {
        const match = raw.match(/\{[\s\S]*\}/)
        if (!match) throw new Error('Parse error. The model did not return clean JSON.')
        parsed = JSON.parse(match[0])
      }

      const items = parsed?.roadmap
      if (!Array.isArray(items) || items.length !== 3) {
        throw new Error('Format error. Expected exactly three roadmap steps.')
      }
      for (const item of items) {
        if (!item?.step_title || !item?.description || !item?.deadline) {
          throw new Error('Format error. Each step needs a title, description, and deadline.')
        }
      }

      setRoadmap(items)
    } catch (e1) {
      setError(e1?.message || 'Error. Could not generate your roadmap.')
    } finally {
      setIsLoading(false)
    }
  }

  async function downloadPdf() {
    if (!timelineRef.current) return
    setError('')

    try {
      const canvas = await html2canvas(timelineRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let y = 0
      pdf.addImage(imgData, 'PNG', 0, y, imgWidth, imgHeight, undefined, 'FAST')
      while (y + imgHeight > pageHeight) {
        y -= pageHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, y, imgWidth, imgHeight, undefined, 'FAST')
      }

      pdf.save('voter-roadmap.pdf')
    } catch (e) {
      setError(e?.message || 'PDF export failed — try again.')
    }
  }

  const resultsEmpty = !roadmap && !isLoading

  return (
    <div className="voter-roadmap-inner">
      <div className="section-header">
        <div className="roadmap-nvsp-callout" role="note" aria-label="Important: Voter ID">
          <strong>Main step:</strong> Get your Voter ID (EPIC) first. Apply / update on the official{' '}
          <a href="https://voters.eci.gov.in/" target="_blank" rel="noopener noreferrer">
            National Voters’ Services Portal (NVSP)
          </a>
          . New enrolment is typically <strong>Form 6</strong>; corrections often <strong>Form 8</strong>.
        </div>
        <h2 className="section-title">Your Voter Roadmap</h2>
        <p className="section-subtitle">
          2026–2027 cycle — fill your details on the left; your 3-step plan appears on the right.
        </p>
      </div>

      <div className="election-map-shell">
        <div className="election-control-panel">
          <div className="control-topline">
            <span className="material-icons" aria-hidden="true">
              account_tree
            </span>
            <p>Build my plan — age, state, interests</p>
          </div>

          {!roadmap ? (
            <form onSubmit={handleGenerate}>
              <div className="election-controls">
                <div className="control-field">
                  <label htmlFor="roadmap-age">Age</label>
                  <input
                    id="roadmap-age"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    placeholder="e.g. 19"
                    required
                  />
                  {isUnder18 && (
                    <div className="roadmap-under-18" role="status">
                      <strong>Under 18:</strong> {under18Quip}
                    </div>
                  )}
                </div>

                <div className="control-field">
                  <label htmlFor="roadmap-state">Home state</label>
                  <select
                    id="roadmap-state"
                    value={stateVal}
                    onChange={e => setStateVal(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Choose your state
                    </option>
                    {STATES.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="control-field">
                  <label>
                    Interests <span style={{ fontWeight: 600, opacity: 0.75 }}>({interests.length}/5)</span>
                  </label>
                  <div className="roadmap-chips">
                    {INTEREST_OPTIONS.map(label => {
                      const on = interests.includes(label)
                      return (
                        <button
                          key={label}
                          type="button"
                          className={`roadmap-chip${on ? ' is-on' : ''}`}
                          onClick={() => toggleInterest(label)}
                          aria-pressed={on}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {(error || !API_KEY) && (
                  <p className="election-map-feedback" style={{ color: '#b42318' }}>
                    {error || 'Missing key. Set VITE_GEMINI_API_KEY in .env and restart Vite.'}
                  </p>
                )}

                <div className="election-cta-row">
                  <button type="submit" className="election-primary-btn" disabled={!canSubmit}>
                    {isLoading ? 'Generating…' : 'Generate my roadmap'}
                  </button>
                  <button type="button" className="election-secondary-btn" onClick={reset}>
                    Reset
                  </button>
                </div>

                <p className="election-map-feedback">
                  Note: AI text is a draft — confirm dates and rules on{' '}
                  <a href="https://www.eci.gov.in/" target="_blank" rel="noopener noreferrer">
                    eci.gov.in
                  </a>{' '}
                  and your state CEO via the directory link in Step 2.
                </p>
              </div>
            </form>
          ) : (
            <div className="roadmap-profile-snapshot">
              <p className="bracket-kicker" style={{ marginBottom: 0 }}>
                Locked-in inputs
              </p>
              <dl>
                <dt>Age</dt>
                <dd>{age}</dd>
                <dt>State</dt>
                <dd>{stateVal}</dd>
                <dt>Interests</dt>
                <dd>{interests.map(i => `[ ${i} ]`).join(' ')}</dd>
              </dl>
              <div className="election-cta-row">
                <button type="button" className="election-secondary-btn" onClick={() => setRoadmap(null)}>
                  Edit inputs
                </button>
                <button type="button" className="election-secondary-btn" onClick={reset}>
                  Start over
                </button>
              </div>
              <p className="election-map-feedback" style={{ marginTop: 8 }}>
                Voter ID:{' '}
                <a href="https://voters.eci.gov.in/" target="_blank" rel="noopener noreferrer">
                  NVSP (voters.eci.gov.in)
                </a>
              </p>
            </div>
          )}
        </div>

        <div
          ref={timelineRef}
          className={`election-results${resultsEmpty ? ' is-empty' : ''}`}
          style={{ minHeight: roadmap || isLoading ? 'auto' : undefined }}
        >
          <AnimatePresence mode="wait">
            {resultsEmpty && (
              <motion.div
                key="placeholder"
                className="election-results-placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <span className="material-icons" aria-hidden="true">
                  touch_app
                </span>
                <h3>[ Your roadmap appears here ]</h3>
                <p>
                  [ Left panel: details ] → [ Right panel: three clean steps with deadlines ] — same rhythm as the
                  Election Navigator.
                </p>
              </motion.div>
            )}

            {isLoading && (
              <motion.div
                key="loading"
                className="election-results-placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <p className="election-map-feedback is-loading">Generating your roadmap…</p>
                <h3>Working on it…</h3>
                <p>Gemini 2.5 Flash-Lite is drafting your plan. Give it a moment.</p>
              </motion.div>
            )}

            {roadmap && !isLoading && (
              <motion.div
                key="timeline"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="election-results-top">
                  <h3 className="roadmap-step-title" style={{ margin: 0 }}>
                    Your 3-step action plan
                  </h3>
                </div>

                {error && (
                  <p className="election-map-feedback" style={{ color: '#b42318', marginBottom: 12 }}>
                    {error}
                  </p>
                )}

                <motion.div
                  className="roadmap-timeline"
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.14 } }
                  }}
                >
                  {roadmap.map((item, idx) => (
                    <motion.article
                      key={`${item.step_title}-${idx}`}
                      className="roadmap-step-card"
                      variants={{
                        hidden: { opacity: 0, x: -12 },
                        show: { opacity: 1, x: 0 }
                      }}
                      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                    >
                      <div className="roadmap-step-head">
                        <h4 className="roadmap-step-title">
                          [ Step {idx + 1} ] {item.step_title}
                        </h4>
                        <span className="roadmap-deadline">Due: {item.deadline}</span>
                      </div>
                      <p className="roadmap-step-body">{item.description}</p>
                      {OFFICIAL_STEP_RESOURCES[idx] && (
                        <div className="roadmap-official-links">
                          <p>Official link (ECI / India)</p>
                          <a
                            href={OFFICIAL_STEP_RESOURCES[idx].href}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {OFFICIAL_STEP_RESOURCES[idx].anchor}
                          </a>
                          <span className="roadmap-link-hint">{OFFICIAL_STEP_RESOURCES[idx].hint}</span>
                        </div>
                      )}
                    </motion.article>
                  ))}
                </motion.div>

                <div className="roadmap-results-actions">
                  <button type="button" className="election-primary-btn" onClick={downloadPdf}>
                    Download roadmap (PDF)
                  </button>
                  <button type="button" className="election-secondary-btn" onClick={reset}>
                    Clear · new run
                  </button>
                </div>

                <p className="roadmap-footnote">
                  May 2026: Official URLs above use Election Commission of India domains (verified reachable). Always
                  re-check for the latest notices before deadlines — especially for {stateVal}.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
