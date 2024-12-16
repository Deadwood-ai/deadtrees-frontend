import { Typography } from "antd";

const { Title, Paragraph } = Typography;

export default function Datenschutzerklaerung() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Title level={1}>Datenschutzerklärung</Title>
      <div className="space-y-8">
        <section>
          <Title level={3}>Verantwortlicher</Title>
          <Paragraph>
            Universität Freiburg
            <br />
            Lehrstuhl für Sensorbasierte Geoinformatik
            <br />
            Tennenbacher Str. 4<br />
            79106 Freiburg
            <br />
            Deutschland
            <br />
            E-Mail: sekretariat@geosense.uni-freiburg.de
            <br />
            Telefon: +49 (0)761 203 – 3694
          </Paragraph>
          <Paragraph>
            Datenschutzbeauftragter:
            <br />
            Albert-Ludwigs-Universität Freiburg
            <br />
            Der Datenschutzbeauftragte
            <br />
            Fahnenbergplatz
            <br />
            79085 Freiburg
            <br />
            E-Mail: datenschutzbeauftragter@uni-freiburg.de
          </Paragraph>
        </section>

        <section>
          <Title level={3}>Allgemeine Hinweise zur Datenverarbeitung</Title>
          <Paragraph>
            Wir verarbeiten personenbezogene Daten im Einklang mit den Bestimmungen der Datenschutzgrundverordnung
            (DSGVO) und dem Bundesdatenschutzgesetz (BDSG). Die DSGVO ist eine europäische Verordnung, welche den
            Datenschutz in der europäischen Union einheitlich regelt. Das BDSG ergänzt die DSGVO auf nationaler Ebene.
            Die konkreten Rechtsgrundlagen werden in den jeweiligen Abschnitten dieser Erklärung genannt. Wir
            verarbeiten dabei so wenige Daten wie möglich. Daten werden nur so lange gespeichert, wie sie für den
            jeweiligen Zweck erforderlich sind oder gesetzliche Aufbewahrungsfristen bestehen.
          </Paragraph>
        </section>

        <section>
          <Title level={3}>Bereitstellung der Website und Server-Logfiles</Title>
          <Paragraph>
            Unsere Website wird auf Servern der Hetzner Online GmbH in Deutschland gehostet. Beim Aufruf unserer Website
            werden automatisch folgende Daten erhoben: IP-Adresse (sofern möglich durch Kürzung anonymisiert),
            Datum/Uhrzeit des Zugriffs, aufgerufene Seite, Browsertyp, Betriebssystem und Referrer-URL. Diese
            Datenverarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der
            technischen Bereitstellung und Sicherheit). Die Daten werden in der Regel nach 7-14 Tagen gelöscht.
          </Paragraph>
        </section>

        <section>
          <Title level={3}>Hosting und Infrastruktur (Firebase)</Title>
          <Paragraph>
            Wir nutzen Firebase (Google Ireland Ltd.) mit Standort in der EU zur Bereitstellung bestimmter Funktionen.
            Firebase kann technische Daten (ähnlich den oben genannten Logfiles, sowie z.B. IP Adressen, Gerätedetails
            und Browsereinstellungen) verarbeiten. Die Daten können innerhalb oder außerhalb der EU gespeichert sein.
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse). Weitere Informationen:&nbsp;
            <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer">
              Datenschutz bei Firebase
            </a>
            .
          </Paragraph>
        </section>

        <section>
          <Title level={3}>Nutzerkonten und Anmeldung (Supabase Auth)</Title>
          <Paragraph>
            Für registrierte Nutzer bieten wir eine E-Mail-basierte Anmeldung über Supabase an. Erhoben werden
            E-Mail-Adresse und Authentifizierungsdaten. Wir verarbeiten dabei nur so wenig Daten, wie unbedingt
            notwendig. Die Verarbeitung erfolgt nach Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung). Serverstandort von
            Supabase ist innerhalb der EU. Die Email Adresse wird für die Dauer der Nutzung des Accounts gespeichert und
            bei Löschung des Accounts gelöscht. Weitere Infos:
            <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
              &nbsp;Supabase Datenschutzerklärung
            </a>
            . Die Löschung des Accounts kann durch einen Antrag an den oben genannten Verantwortlichen oder den
            Datenschutzbeauftragten erfolgen.
          </Paragraph>
        </section>

        <section>
          <Title level={3}>Cookies</Title>
          <Paragraph>
            Wir setzen Cookies ein, sobald Sie ein Nutzerkonto erstellen und sich anmelden. Diese Cookies dienen dazu,
            Ihre Sitzung aufrechtzuerhalten und den erneuten Login zu erleichtern. Die Cookies sind dabei [expiry
            date/time]. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer
            nutzerfreundlichen Gestaltung). Sie werden darauf hingewiesen, dass die Nutzung dieser Webseite Cookies
            setzt. Sie können Cookies im Browser löschen oder blockieren; dies kann jedoch zu Funktionseinschränkungen
            führen.
          </Paragraph>
        </section>

        <section>
          <Title level={3}>Analyse-Tools (PostHog)</Title>
          <Paragraph>
            Wir verwenden PostHog zur Analyse des Nutzerverhaltens. Hierbei werden möglichst keine IP-Adressen
            gespeichert, sondern anonymisierte/pseudonymisierte Nutzungsdaten (z. B. Klickpfade, Seitenaufrufe,
            Gerätemerkmale, Browser Details). Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an
            der Optimierung unseres Angebots). Die Daten werden innerhalb der EU verarbeitet. Weitere Infos:
            <a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer">
              &nbsp;PostHog Datenschutzerklärung
            </a>
          </Paragraph>
        </section>

        <section>
          <Title level={3}>Karten- und Geodienste (Bing Maps)</Title>
          <Paragraph>
            Wir nutzen Bing Maps, einen Dienst der Microsoft Corporation, um geographische Informationen anzuzeigen.
            Beim Aufruf von Seiten mit Bing Maps kann Ihre IP-Adresse an Microsoft in die USA übertragen und dort
            verarbeitet werden. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer
            nutzerfreundlichen Kartenfunktion). Daten können in die USA übertragen werden. Weitere Informationen:
            <a href="https://privacy.microsoft.com/de-de/privacystatement" target="_blank" rel="noopener noreferrer">
              &nbsp;Microsoft Datenschutzerklärung
            </a>
            .
          </Paragraph>
        </section>

        <section>
          <Title level={3}>Nutzerbeiträge und hochgeladene Inhalte</Title>
          <Paragraph>
            Nutzer können Bilder oder Geodaten zur Erforschung globaler Baumsterblichkeitsdynamiken beitragen. Bitte
            vermeiden Sie das Hochladen personenbezogener Daten. Sollten solche Daten dennoch enthalten sein, erfolgt
            die Verarbeitung auf Basis Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Mit dem Hochladen der Daten
            stimmen Sie zu, dass diese unter der von Ihnen gewählten CC-Lizenz öffentlich genutzt werden dürfen.
            Unzulässige Inhalte können gelöscht werden. Nutzer können die Löschung ihrer Inhalte jederzeit beantragen,
            indem Sie eine E-Mail an den oben genannten Verantwortlichen senden. Die Metadaten werden ebenfalls für die
            Verarbeitung benötigt.
          </Paragraph>
        </section>

        <section>
          <Title level={3}>Kontaktaufnahme</Title>
          <Paragraph>
            Bei Kontakt per E-Mail werden Ihre E-Mail-Adresse und weitere von Ihnen zur Verfügung gestellte Daten zur
            Bearbeitung Ihrer Anfrage verarbeitet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung),
            wenn die Kontaktaufnahme für die Erbringung einer Dienstleistung oder eines Vertrags notwendig ist,
            ansonsten Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse). Nach abschließender Bearbeitung der Anfrage
            werden die Daten gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen, im Regelfall
            nach 3-6 Monaten.
          </Paragraph>
        </section>

        <section>
          <Title level={3}>Empfänger von Daten</Title>
          <Paragraph>
            Eine Weitergabe personenbezogener Daten an Dritte erfolgt nur, wenn dies gesetzlich vorgeschrieben ist, zur
            Vertragserfüllung erforderlich ist oder Sie eingewilligt haben. Dies betrifft z.B. folgende Dienste: Hetzner
            Online GmbH (Hosting Provider), Google Ireland Ltd. (Firebase), Supabase Inc. (Supabase Auth), PostHog Inc.
            (PostHog Analytics), Microsoft Corporation (Bing Maps). Dienste von Drittanbietern werden im Rahmen der
            datenschutzrechtlichen Vorgaben genutzt. Es kann zu einer Datenverarbeitung außerhalb der EU kommen.
          </Paragraph>
        </section>

        <section>
          <Title level={3}>Ihre Rechte</Title>
          <Paragraph>
            Sie haben folgende Rechte: Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO),
            Einschränkung der Verarbeitung (Art. 18 DSGVO), Datenübertragbarkeit (Art. 20 DSGVO) sowie Widerspruch gegen
            die Verarbeitung (Art. 21 DSGVO) und Widerruf von Einwilligungen (Art. 7 Abs. 3 DSGVO).
          </Paragraph>
          <Paragraph>
            Sie können Ihre Rechte ausüben, indem Sie sich über die oben angegebenen Kontaktdaten an den
            Verantwortlichen oder den Datenschutzbeauftragten wenden. Sie haben zudem das Recht, bei einer
            Aufsichtsbehörde Beschwerde einzulegen, wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer Daten gegen
            geltendes Recht verstößt.
          </Paragraph>
        </section>

        <section>
          <Title level={3}>Änderungen dieser Datenschutzerklärung</Title>
          <Paragraph>
            Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen. Die aktuelle Version ist jederzeit
            auf dieser Website abrufbar. Änderungen werden hier auf der Seite publiziert und Ihnen ggf. per Email
            mitgeteilt. Sie können frühere Versionen dieser Datenschutzerklärung ebenfalls auf dieser Seite einsehen.
          </Paragraph>
        </section>
      </div>
    </div>
  );
}
