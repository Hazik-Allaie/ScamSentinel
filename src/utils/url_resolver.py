"""
ScamSentinel MY — URL Resolver & Unshortener

Async URL unshortener that follows redirect chains (≥3 hops)
and fetches basic DOM content for phishing indicator screening.

Used by the scan pipeline to resolve shortened URLs before
passing them to the Risk Scoring Agent.
"""

import httpx
from dataclasses import dataclass
from typing import Optional


@dataclass
class ResolvedURL:
    """Result of URL resolution."""
    original_url: str
    final_url: str
    redirect_chain: list[str]       # Full chain of redirects followed
    redirect_count: int
    page_title: Optional[str] = None
    page_content_snippet: Optional[str] = None  # First 2000 chars of body text
    is_reachable: bool = True
    error: Optional[str] = None


async def resolve_url(url: str, max_redirects: int = 10) -> ResolvedURL:
    """
    Resolves a URL by following all redirects and fetching the final page.

    - Follows up to max_redirects redirect hops (handles ≥3 as required by PRD F1)
    - Fetches the final destination page content for phishing screening
    - Returns the full redirect chain for transparency

    Args:
        url: The URL to resolve (may be shortened)
        max_redirects: Maximum redirect hops to follow (default 10)

    Returns:
        ResolvedURL with final destination, redirect chain, and page content
    """
    # Ensure URL has a scheme
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    redirect_chain = [url]

    try:
        async with httpx.AsyncClient(
            follow_redirects=False,
            timeout=httpx.Timeout(10.0),
            verify=False,  # Some phishing sites have invalid certs
        ) as client:
            current_url = url
            hop_count = 0

            # Manually follow redirects to capture the full chain
            while hop_count < max_redirects:
                response = await client.get(current_url)

                if response.is_redirect:
                    next_url = str(response.next_request.url) if response.next_request else None
                    if not next_url:
                        # Try Location header directly
                        next_url = response.headers.get("location", "")
                        if next_url and not next_url.startswith("http"):
                            # Handle relative redirects
                            from urllib.parse import urljoin
                            next_url = urljoin(current_url, next_url)

                    if not next_url:
                        break

                    redirect_chain.append(next_url)
                    current_url = next_url
                    hop_count += 1
                else:
                    # Final destination reached — no more redirects
                    break

            # Fetch the final page content for phishing screening
            page_title, page_content = await _fetch_page_content(client, current_url)

            return ResolvedURL(
                original_url=url,
                final_url=current_url,
                redirect_chain=redirect_chain,
                redirect_count=hop_count,
                page_title=page_title,
                page_content_snippet=page_content,
                is_reachable=True,
            )

    except httpx.TimeoutException:
        return ResolvedURL(
            original_url=url,
            final_url=redirect_chain[-1],
            redirect_chain=redirect_chain,
            redirect_count=len(redirect_chain) - 1,
            is_reachable=False,
            error="Request timed out — the URL may be unreachable or intentionally slow.",
        )
    except Exception as e:
        return ResolvedURL(
            original_url=url,
            final_url=redirect_chain[-1],
            redirect_chain=redirect_chain,
            redirect_count=len(redirect_chain) - 1,
            is_reachable=False,
            error=f"Failed to resolve URL: {str(e)}",
        )


async def _fetch_page_content(
    client: httpx.AsyncClient,
    url: str,
) -> tuple[Optional[str], Optional[str]]:
    """
    Fetches the page at the given URL and extracts the title and
    a content snippet for the Risk Scoring Agent to analyse.
    """
    try:
        response = await client.get(url, follow_redirects=True)
        html = response.text

        # Extract <title> tag
        title = None
        title_start = html.lower().find("<title>")
        title_end = html.lower().find("</title>")
        if title_start != -1 and title_end != -1:
            title = html[title_start + 7:title_end].strip()

        # Extract visible text content (strip HTML tags)
        import re
        # Remove script and style blocks
        clean = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", html, flags=re.DOTALL | re.IGNORECASE)
        # Remove all remaining HTML tags
        clean = re.sub(r"<[^>]+>", " ", clean)
        # Collapse whitespace
        clean = re.sub(r"\s+", " ", clean).strip()

        # Return first 2000 chars as content snippet
        return title, clean[:2000] if clean else None

    except Exception:
        return None, None
