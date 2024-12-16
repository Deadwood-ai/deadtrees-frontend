import { Typography } from "antd";

const { Title, Paragraph } = Typography;

export default function TermsOfService() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Title level={1}>Nutzungsbedingungen (Terms of Service)</Title>
      <div className="space-y-8">
        <section>
          <Title level={3}>1. Geltungsbereich</Title>
          <Paragraph>
            Diese Nutzungsbedingungen regeln die Nutzung der Website <i>https://deadtrees.earth</i> (nachfolgend
            „Plattform“ genannt), sowie aller zugehörigen Subdomains, betrieben durch den Lehrstuhl für Sensorbasierte
            Geoinformatik der Universität Freiburg (nachfolgend „Betreiber“ genannt). Mit dem Zugriff auf oder der
            Nutzung dieser Plattform erklären Sie sich mit diesen Nutzungsbedingungen einverstanden.
          </Paragraph>
        </section>

        <section>
          <Title level={3}>2. Leistungsbeschreibung</Title>
          <Paragraph>
            Die Plattform stellt eine dynamische, gemeinschaftlich aufgebaute Datenbank für georeferenzierte
            Luftbild-Orthophotos (in dem Format GeoTIFF) sowie zugehörige Labels für stehendes Totholz (in den Formaten
            GeoJSON, Shapefile, GeoPackage) bereit. Die Plattform ermöglicht es ermöglicht es Nutzern, Orthophotos und
            Daten herunterzuladen, hochzuladen, zu visualisieren und mit Metadaten, sowie ggf. vorhandenen
            Segmentierungen von stehendem Totholz, zu verknüpfen.
          </Paragraph>
          <Paragraph>
            Darüber hinaus werden Tools zur Verfügung gestellt, um Daten zu durchsuchen, zu filtern und maschinell
            erstellte oder manuell erzeugte Labels für Forschungszwecke herunterzuladen. Die Plattform und ihre Inhalte
            richten sich sowohl an Forschungseinrichtungen als auch an die allgemeine Öffentlichkeit und zielt darauf
            ab, einen wertvollen Datensatz für die Forschung zum Thema Totholz zu schaffen.
          </Paragraph>
          <Paragraph>
            Die Plattform wird kontinuierlich weiterentwickelt und der Nutzer kann im Regelfall erwarten, dass die hier
            genannten Funktionen verfügbar sind. Sollten durch Wartungsarbeiten Einschränkungen entstehen, so wird dies
            rechtzeitig auf der Plattform kommuniziert.
          </Paragraph>
        </section>

        <section>
          <Title level={3}>3. Registrierung und Nutzerkonto</Title>
          <Paragraph>
            Für den Zugang zu bestimmten Funktionen (z. B. Hochladen von Orthophotos oder Labels) ist eine Registrierung
            erforderlich. Bei der Registrierung müssen Sie eine gültige E-Mail-Adresse angeben. Sie sind verpflichtet,
            Ihre Zugangsdaten vertraulich zu behandeln und ein starkes Passwort zu wählen. Ihr Nutzerkonto darf nicht an
            Dritte weitergegeben werden. Bei Verlust der Zugangsdaten können diese über den entsprechenden Link
            zurückgesetzt werden.
          </Paragraph>
          <Paragraph>
            Der Betreiber behält sich das Recht vor, Nutzerkonten jederzeit zu sperren oder zu löschen, insbesondere bei
            Verstößen gegen diese Nutzungsbedingungen oder bei Missbrauch der Plattform. Jedes Nutzerkonto ist für die
            hochgeladenen Daten verantwortlich. Nach Löschung des Nutzerkontos werden die hochgeladenen Daten nach
            Absprache mit dem Nutzer ggf. anonymisiert weiter verwendet.
          </Paragraph>
        </section>

        <section>
          <Title level={3}>4. Nutzerbeiträge</Title>
          <Paragraph>
            Nutzer können Orthophotos, Labels oder andere Inhalte (nachfolgend „Nutzerbeiträge“) hochladen. Mit dem
            Hochladen von Nutzerbeiträgen erklären Sie, dass Sie über alle erforderlichen Rechte an diesen Beiträgen
            verfügen und dass durch deren Veröffentlichung keine Rechte Dritter verletzt werden. Insbesondere sind
            personenbezogene Daten Dritter (z. B. identifizierbare Personen in Bildmaterial) nach Möglichkeit zu
            vermeiden. Darüber hinaus sind Sie verpflichtet, Metadaten für die hochgeladenen Daten anzugeben.
          </Paragraph>
          <Paragraph>
            Alle von Nutzern hochgeladenen Inhalte werden unter der Creative-Commons-Lizenz CC BY 4.0 (
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">
              https://creativecommons.org/licenses/by/4.0/
            </a>
            ) zur Verfügung gestellt, sofern nicht anders ausgewiesen. Mit dem Hochladen der Daten räumen Sie die
            Lizenzrechte nach CC BY 4.0 ein. Dies ermöglicht die Weiterverwendung und Weiterverbreitung der Inhalte
            durch Dritte, unter Einhaltung der jeweiligen Lizenzbedingungen.
          </Paragraph>
          <Paragraph>
            Die hochgeladenen Daten werden qualitätsgeprüft und danach auf der Plattform veröffentlicht. Sie behalten
            die Eigentumsrechte an Ihren hochgeladenen Daten, lizensieren diese aber an die Plattform und alle weiteren
            Nutzer unter der CC BY 4.0 Lizenz. Sie können die von Ihnen hochgeladenen Daten jederzeit wieder entfernen,
            die vorherigen Nutzung durch andere Nutzer wird dadurch jedoch nicht aufgehoben.
          </Paragraph>
        </section>

        <section>
          <Title level={3}>5. Rechte und Pflichten der Nutzer</Title>
          <Paragraph>
            Als Nutzer verpflichten Sie sich, die Plattform nur im Einklang mit geltendem Recht sowie den vorliegenden
            Nutzungsbedingungen zu verwenden. Insbesondere ist es untersagt:
          </Paragraph>
          <ul>
            <li>
              Inhalte hochzuladen, die gegen Urheberrechte, Persönlichkeitsrechte oder sonstige Rechte Dritter
              verstoßen.
            </li>
            <li>Unwahre oder irreführende Informationen bereitzustellen.</li>
            <li>Die Plattform zur Verbreitung von Malware, Spam oder rechtswidrigen Inhalten zu nutzen.</li>
            <li>
              Die Plattform und ihre Daten zu reverse-engineeren oder zu versuchen unautorisierten Zugriff auf die
              Backendsysteme zu erhalten.
            </li>
          </ul>
        </section>

        <section>
          <Title level={3}>6. Haftungsausschluss</Title>
          <Paragraph>
            Die Plattform und ihre Dienste werden auf einer "as is" und "as available" Basis bereitgestellt.
          </Paragraph>
          <Paragraph>
            Der Betreiber ist bemüht, die Plattform und ihre Inhalte stets aktuell, korrekt und vollständig zu halten,
            übernimmt jedoch keine Gewähr dafür. Die Nutzung der Plattform erfolgt auf eigenes Risiko. Der Betreiber
            haftet nur für Schäden, die auf vorsätzlichem oder grob fahrlässigem Verhalten beruhen. Jegliche Haftung für
            indirekte Schäden, Folgeschäden oder zufällige Schäden ist, soweit gesetzlich zulässig, ausgeschlossen.
          </Paragraph>
          <Paragraph>
            Der Betreiber übernimmt keine Verantwortung für die Richtigkeit, Vollständigkeit und Qualität der Daten,
            welche durch Drittparteien hochgeladen wurde. Die Daten werden zwar geprüft, jedoch können Fehler nicht
            immer ausgeschlossen werden.
          </Paragraph>
          <Paragraph>
            Der Betreiber übernimmt keine Verantwortung für die Richtigkeit oder Verfügbarkeit von Inhalten Dritter, auf
            die über Links auf der Plattform verwiesen wird. Des Weiteren übernimmt der Betreiber keine Verantwortung
            für Ausfälle oder Unterbrechungen des Dienstes.
          </Paragraph>
        </section>

        <section>
          <Title level={3}>7. Geistiges Eigentum und Lizenzen</Title>
          <Paragraph>
            Alle auf der Plattform bereitgestellten Inhalte (Orthophotos, Labels, Metadaten, Dokumentationen)
            unterliegen den angegebenen Lizenzen (z. B. Creative Commons CC BY 4.0). Der Nutzer hat sicherzustellen,
            dass bei Verwendung der Inhalte die jeweiligen Lizenzbedingungen eingehalten werden.
          </Paragraph>
        </section>

        <section>
          <Title level={3}>8. Datenschutz</Title>
          <Paragraph>
            Informationen zur Verarbeitung personenbezogener Daten finden Sie in unserer{" "}
            <a href="/datenschutzerklaerung" target="_blank" rel="noopener noreferrer">
              Datenschutzerklärung
            </a>
            .
          </Paragraph>
        </section>

        <section>
          <Title level={3}>9. Änderungen der Nutzungsbedingungen</Title>
          <Paragraph>
            Der Betreiber behält sich das Recht vor, diese Nutzungsbedingungen jederzeit anzupassen. Änderungen werden
            auf der Plattform veröffentlicht und Sie werden ggf. per Email darüber informiert. Die jeweils aktuelle
            Version ist jederzeit auf der Plattform abrufbar. Mit der weiteren Nutzung der Plattform nach Inkrafttreten
            der Änderungen erklären Sie sich mit den neuen Bedingungen einverstanden.
          </Paragraph>
        </section>

        <section>
          <Title level={3}>10. Anwendbares Recht und Gerichtsstand</Title>
          <Paragraph>
            Es gilt das Recht der Bundesrepublik Deutschland, auch für Nutzer außerhalb der Bundesrepublik Deutschland.
            Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit der Nutzung dieser Plattform ist, soweit
            zulässig, Freiburg im Breisgau.
          </Paragraph>
        </section>
      </div>
    </div>
  );
}
