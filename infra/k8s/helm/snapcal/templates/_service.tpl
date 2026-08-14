{{- define "snapcal.service" -}}
apiVersion: v1
kind: Service
metadata:
  name: {{ .name }}
  labels:
    {{- include "snapcal.labels" .context | nindent 4 }}
    app.kubernetes.io/component: {{ .name }}
spec:
  selector:
    {{- include "snapcal.selectorLabels" .context | nindent 4 }}
    app.kubernetes.io/component: {{ .name }}
  ports:
    {{- range .ports }}
    - port: {{ . }}
      targetPort: {{ . }}
    {{- end }}
  type: {{ .serviceType | default "ClusterIP" }}
{{- end }}
