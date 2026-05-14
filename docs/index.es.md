<p align="center">
  <img src="assets/banner.png" alt="Aegis Spec" width="100%">
</p>

# Aegis Spec

**Transforma sistemas heredados en especificaciones ejecutables para agentes de IA.**

¿Conoces ese sistema que nadie quiere tocar? El que lleva 10 años corriendo, genera dinero todos los días, pero nadie sabe bien qué hace por dentro. Aegis Spec fue creado para él.

---

## ¿Qué es Aegis Spec?

Aegis Spec es un framework de ingeniería inversa de especificaciones. Lo instalas dentro del proyecto heredado, activas un agente de IA que ya usas, y él coordina un equipo de especialistas para analizar el código y generar especificaciones completas, trazables y listas para cualquier agente codificador.

**En otras palabras:** Aegis Spec convierte código sin documentación en contratos operacionales que un agente de IA puede entender y usar para evolucionar el sistema con seguridad.

---

## Inicio rápido

En la raíz del proyecto heredado:

```bash
npx aegis-spec install
```

Luego abre el proyecto en tu agente de IA favorito y escribe:

```
/aegis
```

Eso es todo. Aegis Spec toma el volante y te guía hasta el final.

---

## Lo que encontrarás aquí

<div class="grid cards" markdown>

- **Por qué existe Aegis Spec**

    El problema que resuelve y por qué importa.

    [:octicons-arrow-right-24: Leer más](por-que-aegis.md)

- **Instalación**

    Dos minutos y estás listo para empezar.

    [:octicons-arrow-right-24: Instalar](instalacao.md)

- **Pipeline de análisis**

    Las 5 fases que convierten código en especificación.

    [:octicons-arrow-right-24: Ver pipeline](pipeline.md)

- **Agentes**

    Conoce el equipo: 14 especialistas, cada uno con su función.

    [:octicons-arrow-right-24: Ver agentes](agentes/index.md)

</div>

---

## Garantía de seguridad

!!! danger "💾 Haz una copia de seguridad antes de empezar"
    Aunque Aegis Spec nunca modifica tus archivos, los agentes de IA pueden cometer errores. **Recomendamos fuertemente:**

    1. **Versiona el proyecto en Git** — asegúrate de que todos los archivos estén commiteados antes de iniciar el análisis
    2. **Ten el repositorio en GitHub** (o GitLab, Bitbucket) — para tener una copia remota segura
    3. **Haz una copia local de la carpeta** — un simple `cp -r mi-proyecto mi-proyecto-backup` protege contra cualquier imprevisto

    Si algo inesperado ocurre durante el análisis, puedes restaurar el estado original con `git restore .` o desde la copia de seguridad.

!!! warning "Aegis Spec nunca toca tus archivos"
    Los agentes escriben **solo** en `aegis/` y `aegis/`. Ningún archivo de tu proyecto es modificado, eliminado o sobreescrito. Nunca.

!!! info "Sin claves de API"
    Aegis Spec no solicita, no almacena ni transmite claves de API de ningún servicio. La inteligencia viene del agente que ya usas en tu entorno.
