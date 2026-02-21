'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n'
import { getMessages } from '@/lib/messages'
import {
  OPPORTUNITIES_BAYES_PRIOR_WEIGHT,
  OPPORTUNITIES_COMPETITION_P95,
  OPPORTUNITIES_GAP_CAP_P90,
  OPPORTUNITIES_USERS_P95,
  OPPORTUNITIES_VOTES_P95,
} from '@/lib/opportunities/constants'

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

export default function ScoringModelPage() {
  const { language } = useI18n()
  const t = getMessages(language).scoring

  return (
    <div className="min-h-screen px-6 py-10">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
            <p className="text-muted-foreground mt-2 text-sm">{t.description}</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/">{t.backToHome}</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.formulaTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="bg-muted block overflow-x-auto rounded-md px-3 py-2 text-sm">{t.formulaText}</code>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t.factorsTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                <span className="font-medium">{t.demandNorm}: </span>
                {t.demandNormText}
              </p>
              <p>
                <span className="font-medium">{t.gapEffective}: </span>
                {t.gapEffectiveText}
              </p>
              <p>
                <span className="font-medium">{t.competitionNorm}: </span>
                {t.competitionNormText}
              </p>
              <p>
                <span className="font-medium">{t.confidenceNorm}: </span>
                {t.confidenceNormText}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.constantsTitle}</CardTitle>
              <CardDescription>{t.constantsDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                <span className="font-medium">{t.constantBayesPrior}: </span>
                {OPPORTUNITIES_BAYES_PRIOR_WEIGHT}
              </p>
              <p>
                <span className="font-medium">{t.constantUsersP95}: </span>
                {formatPercent(OPPORTUNITIES_USERS_P95)}
              </p>
              <p>
                <span className="font-medium">{t.constantVotesP95}: </span>
                {formatPercent(OPPORTUNITIES_VOTES_P95)}
              </p>
              <p>
                <span className="font-medium">{t.constantCompetitionP95}: </span>
                {formatPercent(OPPORTUNITIES_COMPETITION_P95)}
              </p>
              <p>
                <span className="font-medium">{t.constantGapP90}: </span>
                {formatPercent(OPPORTUNITIES_GAP_CAP_P90)}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
