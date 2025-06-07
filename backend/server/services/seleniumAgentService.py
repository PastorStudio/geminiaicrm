#!/usr/bin/env python3
"""
Servicio de automatización de agentes externos usando Selenium
Este módulo permite interactuar con agentes web como ChatGPT mediante web scraping
"""

import json
import sys
import time
import logging
from typing import Dict, Any, Optional
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import requests

class SeleniumAgentService:
    """Servicio para automatizar respuestas de agentes externos via web scraping"""
    
    def __init__(self, headless: bool = True):
        self.headless = headless
        self.driver = None
        self.logger = self._setup_logger()
        
    def _setup_logger(self):
        """Configurar logging"""
        logger = logging.getLogger('SeleniumAgentService')
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            logger.addHandler(handler)
            
        return logger
    
    def _setup_driver(self):
        """Configurar el driver de Chrome con las opciones necesarias"""
        try:
            chrome_options = Options()
            
            if self.headless:
                chrome_options.add_argument("--headless")
            
            # Opciones esenciales para entornos containerizados como Replit
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--disable-extensions")
            chrome_options.add_argument("--disable-web-security")
            chrome_options.add_argument("--allow-running-insecure-content")
            chrome_options.add_argument("--disable-setuid-sandbox")
            chrome_options.add_argument("--disable-background-timer-throttling")
            chrome_options.add_argument("--disable-backgrounding-occluded-windows")
            chrome_options.add_argument("--disable-renderer-backgrounding")
            chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
            
            # Usar Chromium instalado en el sistema en lugar de ChromeDriver automático
            chrome_options.binary_location = "/nix/store/*/bin/chromium"
            
            try:
                # Intentar usar chromedriver del sistema primero
                service = Service("/nix/store/*/bin/chromedriver")
                self.driver = webdriver.Chrome(service=service, options=chrome_options)
            except:
                # Fallback a ChromeDriver automático
                try:
                    service = Service(ChromeDriverManager().install())
                    self.driver = webdriver.Chrome(service=service, options=chrome_options)
                except:
                    # Último fallback sin service especificado
                    self.driver = webdriver.Chrome(options=chrome_options)
            
            self.driver.set_window_size(1920, 1080)
            self.driver.implicitly_wait(10)
            
            self.logger.info("✅ Driver de Chrome configurado correctamente")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error configurando driver: {e}")
            return False
    
    def _detect_agent_type(self, agent_url: str) -> str:
        """Detectar el tipo de agente basado en la URL"""
        if "chatgpt.com" in agent_url or "openai.com" in agent_url:
            return "chatgpt"
        elif "claude.ai" in agent_url:
            return "claude"
        elif "bard.google.com" in agent_url or "gemini.google.com" in agent_url:
            return "gemini"
        else:
            return "unknown"
    
    def _handle_chatgpt_interaction(self, agent_url: str, message: str) -> Optional[str]:
        """Manejar interacción específica con ChatGPT"""
        try:
            self.logger.info(f"🤖 Accediendo a ChatGPT: {agent_url}")
            self.driver.get(agent_url)
            
            # Esperar a que la página cargue
            wait = WebDriverWait(self.driver, 30)
            
            # Intentar diferentes selectores para el área de texto
            text_selectors = [
                "textarea[placeholder*='Message']",
                "textarea[data-id='root']", 
                "#prompt-textarea",
                "textarea[placeholder*='Send a message']",
                ".prose textarea",
                "div[contenteditable='true']"
            ]
            
            text_area = None
            for selector in text_selectors:
                try:
                    text_area = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))
                    self.logger.info(f"✅ Área de texto encontrada con selector: {selector}")
                    break
                except TimeoutException:
                    continue
            
            if not text_area:
                self.logger.error("❌ No se pudo encontrar el área de texto en ChatGPT")
                return None
            
            # Limpiar y escribir el mensaje
            text_area.clear()
            text_area.send_keys(message)
            
            # Buscar botón de envío
            send_selectors = [
                "button[data-testid='send-button']",
                "button[aria-label='Send message']",
                "button:has-text('Send')",
                ".absolute.right-2 button",
                "button[type='submit']"
            ]
            
            send_button = None
            for selector in send_selectors:
                try:
                    send_button = self.driver.find_element(By.CSS_SELECTOR, selector)
                    if send_button.is_enabled():
                        break
                except NoSuchElementException:
                    continue
            
            if not send_button or not send_button.is_enabled():
                self.logger.error("❌ No se pudo encontrar o activar el botón de envío")
                return None
            
            # Enviar mensaje
            send_button.click()
            self.logger.info("📤 Mensaje enviado a ChatGPT")
            
            # Esperar respuesta
            time.sleep(3)
            
            # Buscar la respuesta más reciente
            response_selectors = [
                ".markdown.prose",
                ".message-content",
                "[data-message-author-role='assistant'] .markdown",
                ".conversation-turn .markdown"
            ]
            
            for selector in response_selectors:
                try:
                    # Obtener todos los elementos de respuesta y tomar el último
                    response_elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    if response_elements:
                        response_text = response_elements[-1].text.strip()
                        if response_text and len(response_text) > 10:
                            self.logger.info(f"✅ Respuesta obtenida de ChatGPT: {response_text[:100]}...")
                            return response_text
                except Exception as e:
                    self.logger.warning(f"⚠️ Error obteniendo respuesta con selector {selector}: {e}")
                    continue
            
            self.logger.error("❌ No se pudo obtener respuesta de ChatGPT")
            return None
            
        except Exception as e:
            self.logger.error(f"❌ Error en interacción con ChatGPT: {e}")
            return None
    
    def get_agent_response(self, agent_url: str, message: str, agent_id: str = None) -> Dict[str, Any]:
        """
        Obtener respuesta de un agente externo
        
        Args:
            agent_url: URL del agente
            message: Mensaje a enviar
            agent_id: ID del agente (opcional)
            
        Returns:
            Diccionario con la respuesta y metadatos
        """
        try:
            # Configurar driver si no existe
            if not self.driver:
                if not self._setup_driver():
                    return {
                        "success": False,
                        "error": "No se pudo configurar el driver de navegador",
                        "response": None
                    }
            
            # Detectar tipo de agente
            agent_type = self._detect_agent_type(agent_url)
            self.logger.info(f"🔍 Tipo de agente detectado: {agent_type}")
            
            # Manejar según el tipo
            if agent_type == "chatgpt":
                response = self._handle_chatgpt_interaction(agent_url, message)
            else:
                # Para otros tipos, intentar método genérico
                response = self._handle_generic_interaction(agent_url, message)
            
            if response:
                return {
                    "success": True,
                    "response": response,
                    "agent_type": agent_type,
                    "agent_id": agent_id,
                    "timestamp": time.time()
                }
            else:
                return {
                    "success": False,
                    "error": "No se pudo obtener respuesta del agente",
                    "response": None
                }
                
        except Exception as e:
            self.logger.error(f"❌ Error general en get_agent_response: {e}")
            return {
                "success": False,
                "error": str(e),
                "response": None
            }
    
    def _handle_generic_interaction(self, agent_url: str, message: str) -> Optional[str]:
        """Manejar interacción genérica para agentes desconocidos"""
        try:
            self.logger.info(f"🌐 Accediendo a agente genérico: {agent_url}")
            self.driver.get(agent_url)
            
            # Esperar carga
            time.sleep(5)
            
            # Buscar campos de texto comunes
            text_selectors = [
                "textarea",
                "input[type='text']",
                "div[contenteditable='true']",
                "[role='textbox']"
            ]
            
            for selector in text_selectors:
                try:
                    text_area = self.driver.find_element(By.CSS_SELECTOR, selector)
                    if text_area.is_displayed() and text_area.is_enabled():
                        text_area.clear()
                        text_area.send_keys(message)
                        
                        # Buscar botón de envío cerca
                        try:
                            send_button = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Send') or contains(text(), 'Submit') or contains(text(), 'Enviar')]")
                            send_button.click()
                            time.sleep(3)
                            
                            # Intentar obtener respuesta
                            page_text = self.driver.find_element(By.TAG_NAME, "body").text
                            return page_text[-500:] if len(page_text) > 500 else page_text
                            
                        except NoSuchElementException:
                            # Intentar enviar con Enter
                            text_area.send_keys("\n")
                            time.sleep(3)
                            
                            page_text = self.driver.find_element(By.TAG_NAME, "body").text
                            return page_text[-500:] if len(page_text) > 500 else page_text
                            
                except NoSuchElementException:
                    continue
            
            self.logger.warning("⚠️ No se pudo interactuar con el agente genérico")
            return None
            
        except Exception as e:
            self.logger.error(f"❌ Error en interacción genérica: {e}")
            return None
    
    def close(self):
        """Cerrar el driver del navegador"""
        if self.driver:
            try:
                self.driver.quit()
                self.logger.info("✅ Driver cerrado correctamente")
            except Exception as e:
                self.logger.warning(f"⚠️ Error cerrando driver: {e}")

def main():
    """Función principal para uso desde línea de comandos"""
    if len(sys.argv) < 3:
        print(json.dumps({
            "success": False,
            "error": "Uso: python seleniumAgentService.py <agent_url> <message> [agent_id]"
        }))
        sys.exit(1)
    
    agent_url = sys.argv[1]
    message = sys.argv[2]
    agent_id = sys.argv[3] if len(sys.argv) > 3 else None
    
    service = SeleniumAgentService(headless=True)
    
    try:
        result = service.get_agent_response(agent_url, message, agent_id)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    finally:
        service.close()

if __name__ == "__main__":
    main()