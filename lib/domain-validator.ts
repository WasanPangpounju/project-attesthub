export function isSameDomain(targetUrl: string, urlToCheck: string): boolean {
  try {
    const target = new URL(targetUrl)
    const check = new URL(urlToCheck)
    const targetHost = target.hostname.replace(/^www\./, "")
    const checkHost = check.hostname.replace(/^www\./, "")
    return checkHost === targetHost || checkHost.endsWith("." + targetHost)
  } catch {
    return false
  }
}
