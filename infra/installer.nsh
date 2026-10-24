; Zusatz für den NSIS-Installer (package.json → build.nsis.include).
; Seit dem Rebranding heißt die App „cTCG Creator“. Verknüpfungen unter dem alten Namen „Card Creator“ entfernt der Installer,
; damit nach einem Update nur noch die neue Verknüpfung auf Desktop und im Startmenü liegt.
!macro customInstall
  Delete "$DESKTOP\Card Creator.lnk"
  Delete "$SMPROGRAMS\Card Creator.lnk"
!macroend
