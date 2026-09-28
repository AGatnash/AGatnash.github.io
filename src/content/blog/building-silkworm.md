---
title: "Building Silkworm: an AI tool for my wife"
author: Ahmed Gatnash
pubDatetime: 2026-09-28T14:29:00+01:00
featured: false
draft: false
tags:
  - AI
  - Legal tech
  - Silkworm
description: "Lessons from building and testing Silkworm, an AI legal tool for barristers, from the first prototype through production."
---
Silkworm began as a tool for my wife, a pupil barrister. I had a close view of how much of her working life involved tedious manual work - things I’d describe as “intern work”. Flicking through large and badly structured case bundles, searching for facts, trying to construct a mental image of what the case involved and the chronology. This normally also involved extreme time pressure, with papers arriving in the evening for the next day.

“Why do you work like this?” I’d exasperatedly ask, as she took a break from her midnight preparations to explain to me for the fifth time the courts, the CPS, and all the other constraints on the profession. *Software can read the papers for you, and surface all the right information*, I insisted, and resolved to prove it by building a tool. That turned into Silkworm.

Within two months I had a working prototype, ready for barristers to test. A twelve-week beta with six barristers followed. These are my notes on the process, and what I learned from it.

## Understanding the work

From the outside, much of criminal legal work looks astonishingly archaic. Huge PDFs, manual search, copy-and-paste workflows, fragmented systems. Many of the information-management problems solved in other fields just hadn’t been here yet.

One of the first problems I had was documenting what “prepare this case from the papers” actually means. Preparing a case is based on intuition gained from experience, and that was very difficult to extract from my wife and other prospective users. Most people don’t think in terms of a clear algorithm for how to carry out a repeatable piece of work, as an engineer would.

You make sure all the right documents are present, reconcile conflicting accounts, distinguish contradiction from inconsistency, look for X if Y appears, notice missing evidence, and keep returning to an earlier document when later information changes its significance. Documenting the workflow once was nowhere near enough - every time I built it, more missing branches, assumptions and edge cases were exposed. Every implementation attempt became another attempt at requirements discovery.

In Silkworm, the barrister uploads the case documents bundle and comes back to a dashboard showing the main information about the case: the names of those involved, key details from witness statements, a chronology of events and a summary of the prosecution’s case.

This doesn’t remove the need to look at the bundle. Rather than flicking through dozens or hundreds of pages while trying to hold the information in their head long enough to form a working mental model, they start with a working model and a map of the case, linked to the relevant page numbers. They can jump much more quickly to thinking about the substantive issues rather than just trying to figure out what happened and what’s going to come up.

The magic moment was when my wife first estimated that it had cut over an hour off her case preparation. This was something I believed it could do from the very start, but it was treated like magic or some kind of revelation by the barristers who saw it. It’s still early to be conclusive about the time saved, and I’m waiting for more people’s reactions.

## What barristers wanted to retain

Some barristers were scared of losing the ability to do this work themselves. Doing the hard drudgery makes them familiar with case law and statute, and builds up the mental muscle they depend on for more advanced and complex cases.

I sympathise with this fear a lot, and think cognitive offloading is something worth thinking hard about. I specifically tried to design Silkworm to automate the rote work and make case preparation more efficient, but not to do the thinking for the barristers. I want them to retain that and not offload it to Silkworm.

The other big concern was fear of the Bar Standards Board, which was also understandable. The barristers I was working with are self-employed, deal with very sensitive data and face personal professional consequences for mistakes. Reliability and safety matter more than novelty or efficiency.

It was important to be legally incorporated, registered with the Information Commissioner’s Office, and have clear terms of service and data processing agreements. It was also important to be well informed about these things, able to discuss them at length and demonstrate familiarity with the issues at the drop of a hat.

The system had to make it possible for the professional to verify what it told them and remain responsible for the work.

## Building and testing the system

Based on all the AI hype, I really thought building a software tool with AI would be simple and take at most a few prompts. Instead, I ended up spending weeks learning about databases and database management, data privacy, engineering for reliability, prompt engineering and LLM cost engineering, as well as software engineering practices such as deployment processes and CI/CD.

Part of engineering for reliability was deciding how to split functionality between deterministic and probabilistic systems: what to allow models to do and what not to. Building production-ready software, especially in high-trust contexts where getting the output wrong has severe consequences, is still very difficult.

I initially treated document processing, model behaviour, citations and security as separate engineering problems, and worked on them separately. In practice, every decision affected several others. Extracting text from badly scanned papers had to preserve document structure and page references so the analysis could be traced back to the source. Citation requirements affected how documents were represented internally. Security meant understanding where data went during upload, processing and storage, and interrogating third-party integrations and defaults. And twice, I had to go back and rebuild the whole engine from scratch.

### Two engine rewrites

The first version of Silkworm worked through four broad stages: after a document-completeness check it would extract raw facts from the whole bundle, draw inferences from that output, then assess the risks. The initial extraction tried to capture everything in one large structured response, which had a hard limit of two million characters of source material and couldn’t reliably cite individual documents.

Over about a week in late January 2026, I rebuilt it as a 13-stages system. They covered independent tasks such as chronology, witness statements, evidence synthesis and analysis by issue. Each stage had its own instructions, output structure, model choice and timeout, and each produced references to its sources. This let me choose specific models for particular tasks, record a failed stage without losing the entire run, and give users a source viewer to check the analysis against the papers. It also removed the earlier fixed limit on the amount of source text.

The next rewrite came this summer, after the product’s launch, when speed became the problem. A case of around 500 pages could take as long as 40 minutes to process, which was frustrating users. We also had not yet seen real-world use on larger bundles, but I wasn’t confident the system would reliably finish them.

So we changed how the work was structured again. Instead of repeatedly reading the same papers for different questions, the “V3” system extracts facts from manageable sections of the bundle (retaining source links), then combines them into a structured case record, before running the analysis over that record. Completed work is saved, so an interrupted run can resume if there are reliability issues.

In one benchmark on a 120-page case, V3 cut analysis time from about 16 minutes to 7.5 minutes, a 53% improvement. This was much better than expected, but not the best news - doing some experiments with Fable (more on this later) led to further optimisations with an *86% reduction in inference cost!*

### Learning what to measure

I asked early users to prepare a case as they ordinarily would, and only after finishing their preparations to run the papers through Silkworm and take a quick look at the results. They could then tell me what it did well, any mistakes, what they would have done differently, what would have been helpful, and what was unnecessary.

Hallucination generally wasn’t a problem in that early testing. Instead, it was failure to produce a usable answer, often because the output didn’t adhere to the required JSON schema, or failure to produce a response at all. After that, it was failure to respond within a reasonable time or budget.

I went in expecting that the most powerful and most recent models would always be best. I experienced a big step backwards when OpenAI deprecated the model I was depending on in favour of a reasoning model. Both latency and cost jumped. A lot of the reasoning process was simply unnecessary for the work I was asking it to do.

I switched to a Mistral model, which was quick, accurate on these tasks and very good at adhering to the JSON schema. After this, I stopped trusting a model’s reputation. Models have varying strengths and weaknesses and need to be measured on the specific type of task.

That’s why I built an entire benchmarking system, the model test suite, to repeatedly test different models against the same set of cases, often with parameter tweaks, and measure cost, latency, accuracy and reliability. I benchmarked 23 models. These measures often trade off against one another, so a local improvement does not necessarily make the product better overall.

## Learning to work with coding agents

Claude Code and Codex made it possible for one person to move across a much larger technical surface area. I could investigate unfamiliar systems, prototype approaches, implement features, test alternatives and diagnose failures at what felt like lightspeed.

For a long time, coding agents were pretty unreliable. Sometimes they would amaze me by resolving problems far more difficult than I expected, and sometimes they’d infuriate me by repeatedly making incomprehensible basic errors. Over time, I built intuitions about what coding agents could and couldn’t do, including the individual models at each reasoning level, but I experienced these issues less and less as time went on - partly because I learned to guard against them through prompting, skills and repo management, but also because the jagged frontier of AI progress moved beyond a lot of these pitfalls.

Sometimes, failures indicated that there was something more difficult going on underneath the surface: hidden complexity that meant what we were trying to do was harder than I realised. That was an indicator to dig deeper. Other times, I would simply break out the most capable and expensive models for short problem-solving and solution-planning runs, before handing the resulting plan back to my standard implementation models (to ration my usage quotas!).

During development, I repeatedly re-ran security reviews and broader codebase audits using newer models. Opus 5.5, GPT 5.6-Sol, Fable 5, Fable 5.1 and GPT-6 Astra each found new issues or questionable assumptions that previous models had missed. Cheaper review made it practical to revisit old code and architectural decisions more often.

Having spent so much time working with coding agents on this project, and seen how much they progressed just in the course of this project, I’ve become both far more optimistic and far more terrified about the direction AI progress is heading. We’re heading into a brave new world, but that’s not the topic of this post.

## The joy of building alone

I enjoyed being able to proceed at my own pace and owning the entire process, rather than having external dependencies I wasn’t in control of. I guess that simulates having massive resources and being able to hire teams of developers to do the work you want. I also enjoyed the forced learning process it induced.

An idea discovered in the morning could be implemented, tested with a user and revised the same day. Progress was constrained much more directly by whether I could understand the problem, make a decision and do the work—not to mention whether I’d got a Codex usage limit reset last night.

I had never really appreciated the amount of coordination overhead imposed by working with a team. Now that I’m more aware of it, I’m thinking about strategies and processes to manage that with teams in future.

Although you’re much more of a direct implementer than ever before, when working with AI agents on extremely difficult or advanced work, you’re also much more of a manager, in the very large institution sense. You can have sprawling hierarchies reporting to you, with massive amounts of information coming up the chain for you to make decisions on - as I imagine a military general or the CEO of a Korean Chaebol does.

The most demanding part was reading often complex and dense reports about what had been built or what issues had emerged, and understanding them well enough to make the decisions required to continue (Opus 5 was bad enough that I eventually had to introduce intermediary models to translate its responses). This made some periods of work (like big engine rewrites) very cognitively demanding and tiring.

## What I would carry into the next thing I build

If I did this again, I’d start by trying to build a system that could produce a measurable output as quickly as possible, so that output could be used as a benchmark to iterate on. I’d also try to implement agent parallelisation much earlier, trusting models to hand off to multiple sub-agents and work for extended periods, reporting back with a structured summary of what was done, issues raised and decisions to be made.

[Silkworm](https://usesilkworm.com/) is now live and publicly available, after beta-testing with barristers from multiple chambers. The work has continued since launch, including the second rewrite of the analysis engine. I hope to write more in future about the evaluation methodology and other details.

I think human time is incredibly valuable. Because of that, I’m happy to see less of it go on things machines can do, and more of it left for things we think machines either can’t or shouldn’t be in charge of.