{{- define "snapcal.deployment" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "snapcal.fullname" .context }}-{{ .name }}
  labels:
    {{- include "snapcal.labels" .context | nindent 4 }}
    app.kubernetes.io/component: {{ .name }}
spec:
  replicas: {{ .replicas }}
  selector:
    matchLabels:
      {{- include "snapcal.selectorLabels" .context | nindent 6 }}
      app.kubernetes.io/component: {{ .name }}
  template:
    metadata:
      labels:
        {{- include "snapcal.selectorLabels" .context | nindent 8 }}
        app.kubernetes.io/component: {{ .name }}
    spec:
      serviceAccountName: {{ include "snapcal.serviceAccountName" .context }}
      imagePullSecrets:
        {{- toYaml .context.Values.imagePullSecrets | nindent 8 }}
      containers:
        - name: {{ .name }}
          image: {{ include "snapcal.image" .context }}
          imagePullPolicy: {{ .context.Values.image.pullPolicy }}
          {{- if .command }}
          command:
            {{- toYaml .command | nindent 12 }}
          {{- end }}
          {{- if .args }}
          args:
            {{- toYaml .args | nindent 12 }}
          {{- end }}
          envFrom:
            - configMapRef:
                name: {{ include "snapcal.fullname" .context }}-env
            - secretRef:
                name: {{ include "snapcal.fullname" .context }}-secrets
          ports:
            {{- range .ports }}
            - containerPort: {{ . }}
            {{- end }}
          resources:
            {{- toYaml .resources | nindent 12 }}
          {{- if .healthPort }}
          livenessProbe:
            httpGet:
              path: /health
              port: {{ .healthPort }}
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: {{ .healthPort }}
            initialDelaySeconds: 5
            periodSeconds: 5
          {{- end }}
{{- end }}
