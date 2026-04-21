import asyncio
import google.generativeai as genai

genai.configure(api_key='AIzaSyALsBUpIz38egyd2Pu8QZ2EMVFR4riSv_E')
model = genai.GenerativeModel('gemini-2.5-flash')

async def main():
    print('starting')
    res = await model.generate_content_async('hi')
    print('done')
    print(res.text)

asyncio.run(main())
