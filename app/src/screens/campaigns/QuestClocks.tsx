import { QUEST_STATUS_ONE } from "../../core/campaigns"
import { href } from "../../lib/router"
import { ClocksEditor } from "./ClocksEditor"
import { questRoute, type CampaignData } from "./campaign-state"

/**
 * Missões › Relógios (U30): os relógios de ameaça e meta da campanha (que saíram do Painel) e, embaixo, os de cada
 * missão, agrupados pela missão, com o nome dela como link e a situação escrita. Cada relógio diz “5 de 8” em texto
 * (o `ClocksEditor`).
 */
export function QuestClocks({ data }: { data: CampaignData }) {
  const quests = data.quests.filter((quest) => quest.clocks?.length)
  const campaignClocks = "error" in data.clocks ? null : data.clocks
  return <div className="campaign-quest-clocks">
    <section className="card stack" aria-labelledby="relogios-da-campanha">
      <h2 id="relogios-da-campanha" className="section-title">Relógios da campanha</h2>
      {"error" in data.clocks
        ? <p className="small" role="alert">O bloco runas-relogios da nota da campanha tem erro: {data.clocks.error}</p>
        : <>
          {campaignClocks!.length === 0 && <p className="small muted">Nenhum relógio. Use para ameaças que avançam e metas do grupo.</p>}
          {!data.campaign.home && <p className="small muted">Sem a nota {data.campaign.name}.md, os relógios da campanha não têm onde ficar.</p>}
          <ClocksEditor path={data.campaign.home} clocks={campaignClocks!} readOnly={data.readOnly || !data.campaign.home} />
        </>}
    </section>
    <section className="card stack" aria-labelledby="relogios-das-missoes">
      <h2 id="relogios-das-missoes" className="section-title">Relógios das missões</h2>
      {quests.length === 0 && <p className="small muted">Nenhuma missão tem relógio. Abra uma missão e acrescente um relógio nela.</p>}
      {quests.map((quest) => <section key={quest.path} className="campaign-quest-clock-group" aria-label={quest.title}>
        <div className="campaign-quest-clock-title">
          <a href={href(questRoute(data.campaign.name, quest.path))}>{quest.order && <span className="mono faint">{quest.order} </span>}{quest.title}</a>
          <span className="small muted">{QUEST_STATUS_ONE[quest.status]}</span>
        </div>
        <ClocksEditor path={quest.path} clocks={quest.clocks!} readOnly={data.readOnly} />
      </section>)}
    </section>
  </div>
}
